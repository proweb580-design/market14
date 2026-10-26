import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { uzsToStripeAmount } from './pricing';
import type { OrderView } from './order.service';

/**
 * Stripe Checkout integration (T-080, T-081).
 * Order status is changed only by server-verified data: a signed webhook
 * or a Checkout Session fetched from the Stripe API — never by browser query params.
 */

export type PaymentOutcome = 'paid' | 'failed' | 'pending';

const CHECKOUT_TTL_SECONDS = 60 * 60; // Stripe requires 30 min – 24 h

// Read lazily so tests and serverless cold starts always see current env
export function getStripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: (process.env.STRIPE_CURRENCY || 'usd').toLowerCase(),
    uzsPerUnit: parseFloat(process.env.STRIPE_UZS_RATE || '12700'),
  };
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeConfig().secretKey);
}

let stripeClient: Stripe | null = null;
let stripeClientKey = '';

export function getStripe(): Stripe {
  const { secretKey } = getStripeConfig();
  if (!secretKey) {
    throw new Error('Онлайн-оплата не настроена: отсутствует STRIPE_SECRET_KEY');
  }
  if (!stripeClient || stripeClientKey !== secretKey) {
    stripeClient = new Stripe(secretKey);
    stripeClientKey = secretKey;
  }
  return stripeClient;
}

/**
 * Maps a Checkout Session state to our payment outcome
 */
export function resolveSessionOutcome(
  session: Pick<Stripe.Checkout.Session, 'status' | 'payment_status'>
): PaymentOutcome {
  if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
    return 'paid';
  }
  if (session.status === 'expired') {
    return 'failed';
  }
  return 'pending';
}

/**
 * Creates a Stripe Checkout Session for a persisted order and returns its hosted URL
 */
export async function createCheckoutSession(
  order: OrderView,
  baseUrl: string,
  customerEmail?: string
): Promise<string> {
  const stripe = getStripe();
  const { currency, uzsPerUnit } = getStripeConfig();
  const idempotencyKey = `checkout-${order.id}`;

  // Payment row first: it fails fast if the order is not really in the database
  await prisma.payment.upsert({
    where: { idempotencyKey },
    create: {
      orderId: order.id,
      provider: 'stripe',
      status: 'pending',
      amountUzs: order.totalUzs,
      currency: 'UZS',
      idempotencyKey,
    },
    update: {},
  });

  try {
    const itemsSummary = order.items.map((i) => `${i.title} × ${i.quantity}`).join('; ').slice(0, 480);

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: order.id,
        customer_email: customerEmail || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: uzsToStripeAmount(order.totalUzs, currency, uzsPerUnit),
              product_data: {
                name: `Заказ ${order.orderNumber} — TashTech`,
                description: itemsSummary || undefined,
              },
            },
          },
        ],
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
        payment_intent_data: {
          metadata: { orderId: order.id, orderNumber: order.orderNumber },
        },
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
        success_url: `${baseUrl}/payment/result?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/result?session_id={CHECKOUT_SESSION_ID}&cancelled=1`,
      },
      { idempotencyKey }
    );

    await prisma.payment.update({
      where: { idempotencyKey },
      data: { providerPaymentId: session.id },
    });

    if (!session.url) {
      throw new Error('Stripe не вернул ссылку на оплату');
    }
    return session.url;
  } catch (err) {
    // Release reserved stock so a failed payment start does not lock products
    await markOrderPaymentFailed(order.id);
    throw err;
  }
}

/**
 * pending_payment → paid. Conditional update makes repeated webhooks a no-op.
 */
export async function markOrderPaid(orderId: string, sessionId?: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: 'pending_payment' },
      data: { status: 'paid' },
    });

    await tx.payment.updateMany({
      where: {
        orderId,
        provider: 'stripe',
        status: { not: 'paid' },
        ...(sessionId ? { providerPaymentId: sessionId } : {}),
      },
      data: { status: 'paid' },
    });

    return updated.count === 1;
  });
}

/**
 * pending_payment → payment_failed and returns reserved stock exactly once
 */
export async function markOrderPaymentFailed(orderId: string, sessionId?: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: 'pending_payment' },
      data: { status: 'payment_failed' },
    });

    if (updated.count === 1) {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await tx.payment.updateMany({
      where: {
        orderId,
        provider: 'stripe',
        status: 'pending',
        ...(sessionId ? { providerPaymentId: sessionId } : {}),
      },
      data: { status: 'failed' },
    });

    return updated.count === 1;
  });
}

/**
 * Applies a server-verified Checkout Session to the order
 */
export async function applyCheckoutSession(
  session: Stripe.Checkout.Session,
  outcome: PaymentOutcome = resolveSessionOutcome(session)
): Promise<PaymentOutcome> {
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) return outcome;

  if (outcome === 'paid') {
    await markOrderPaid(orderId, session.id);
  } else if (outcome === 'failed') {
    await markOrderPaymentFailed(orderId, session.id);
  }
  return outcome;
}

export function constructWebhookEvent(payload: Buffer | string, signature: string): Stripe.Event {
  const { webhookSecret } = getStripeConfig();
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET не задан');
  }
  return getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await applyCheckoutSession(event.data.object);
      break;
    case 'checkout.session.async_payment_succeeded':
      await applyCheckoutSession(event.data.object, 'paid');
      break;
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired':
      await applyCheckoutSession(event.data.object, 'failed');
      break;
    default:
      // Other events are acknowledged and ignored
      break;
  }
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.retrieve(sessionId);
}

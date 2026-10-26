import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import Stripe from 'stripe';

// In-memory stand-in for Prisma: just enough to exercise payment status transitions
const db = vi.hoisted(() => {
  const state = {
    orders: new Map<string, { status: string }>(),
    orderItems: [] as Array<{ orderId: string; productId: string | null; quantity: number }>,
    stock: new Map<string, number>(),
    payments: [] as Array<{ orderId: string; providerPaymentId: string; status: string }>,
  };

  const matchesStatus = (actual: string, cond: any) =>
    cond === undefined || (typeof cond === 'string' ? actual === cond : actual !== cond.not);

  const client: any = {
    order: {
      updateMany: async ({ where, data }: any) => {
        const order = state.orders.get(where.id);
        if (!order || !matchesStatus(order.status, where.status)) return { count: 0 };
        order.status = data.status;
        return { count: 1 };
      },
    },
    orderItem: {
      findMany: async ({ where }: any) => state.orderItems.filter((i) => i.orderId === where.orderId),
    },
    product: {
      update: async ({ where, data }: any) => {
        state.stock.set(where.id, (state.stock.get(where.id) || 0) + data.stock.increment);
      },
    },
    payment: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const p of state.payments) {
          if (p.orderId !== where.orderId) continue;
          if (where.providerPaymentId && p.providerPaymentId !== where.providerPaymentId) continue;
          if (!matchesStatus(p.status, where.status)) continue;
          p.status = data.status;
          count++;
        }
        return { count };
      },
    },
  };
  client.$transaction = async (fn: any) => fn(client);

  return { state, client };
});

vi.mock('../src/db/prisma', () => ({
  prisma: db.client,
  hasValidDatabaseUrl: true,
  isDatabaseConnected: async () => true,
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

const { app } = await import('../src/app');
const payments = await import('../src/services/payment.service');

const stripe = new Stripe('sk_test_dummy_for_tests');

function seedOrder(status = 'pending_payment') {
  db.state.orders.clear();
  db.state.orders.set('order-1', { status });
  db.state.orderItems = [{ orderId: 'order-1', productId: 'prod-1', quantity: 2 }];
  db.state.stock = new Map([['prod-1', 5]]);
  db.state.payments = [{ orderId: 'order-1', providerPaymentId: 'cs_test_1', status: 'pending' }];
}

function sessionEvent(type: string, session: Record<string, unknown>) {
  return JSON.stringify({
    id: `evt_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    type,
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        client_reference_id: 'order-1',
        metadata: { orderId: 'order-1' },
        ...session,
      },
    },
  });
}

function sendWebhook(payload: string, secret = 'whsec_test_secret') {
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return request(app)
    .post('/payments/stripe/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', signature)
    .send(payload);
}

describe('resolveSessionOutcome', () => {
  it('treats a paid session as paid', () => {
    expect(payments.resolveSessionOutcome({ status: 'complete', payment_status: 'paid' })).toBe('paid');
  });

  it('keeps an open or async-processing session pending', () => {
    expect(payments.resolveSessionOutcome({ status: 'open', payment_status: 'unpaid' })).toBe('pending');
    expect(payments.resolveSessionOutcome({ status: 'complete', payment_status: 'unpaid' })).toBe('pending');
  });

  it('treats an expired session as failed', () => {
    expect(payments.resolveSessionOutcome({ status: 'expired', payment_status: 'unpaid' })).toBe('failed');
  });
});

describe('order payment transitions', () => {
  beforeEach(() => seedOrder());

  it('marks the order paid only once', async () => {
    expect(await payments.markOrderPaid('order-1', 'cs_test_1')).toBe(true);
    expect(await payments.markOrderPaid('order-1', 'cs_test_1')).toBe(false);
    expect(db.state.orders.get('order-1')?.status).toBe('paid');
    expect(db.state.payments[0].status).toBe('paid');
  });

  it('returns stock exactly once when payment fails', async () => {
    await payments.markOrderPaymentFailed('order-1', 'cs_test_1');
    await payments.markOrderPaymentFailed('order-1', 'cs_test_1');
    expect(db.state.orders.get('order-1')?.status).toBe('payment_failed');
    expect(db.state.stock.get('prod-1')).toBe(7);
    expect(db.state.payments[0].status).toBe('failed');
  });

  it('never downgrades a paid order to failed', async () => {
    seedOrder('paid');
    db.state.payments[0].status = 'paid';
    expect(await payments.markOrderPaymentFailed('order-1', 'cs_test_1')).toBe(false);
    expect(db.state.orders.get('order-1')?.status).toBe('paid');
    expect(db.state.stock.get('prod-1')).toBe(5);
  });
});

describe('POST /payments/stripe/webhook', () => {
  beforeEach(() => seedOrder());

  it('rejects requests without a signature', async () => {
    const res = await request(app)
      .post('/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .send('{}');
    expect(res.status).toBe(400);
  });

  it('rejects a payload signed with a wrong secret', async () => {
    const payload = sessionEvent('checkout.session.completed', { status: 'complete', payment_status: 'paid' });
    const res = await sendWebhook(payload, 'whsec_wrong');
    expect(res.status).toBe(400);
    expect(db.state.orders.get('order-1')?.status).toBe('pending_payment');
  });

  it('marks the order paid on checkout.session.completed and tolerates redelivery', async () => {
    const payload = sessionEvent('checkout.session.completed', { status: 'complete', payment_status: 'paid' });
    expect((await sendWebhook(payload)).status).toBe(200);
    expect((await sendWebhook(payload)).status).toBe(200);
    expect(db.state.orders.get('order-1')?.status).toBe('paid');
  });

  it('keeps the order pending while an async payment is processing', async () => {
    const payload = sessionEvent('checkout.session.completed', { status: 'complete', payment_status: 'unpaid' });
    expect((await sendWebhook(payload)).status).toBe(200);
    expect(db.state.orders.get('order-1')?.status).toBe('pending_payment');
  });

  it('fails the order and restores stock on checkout.session.expired', async () => {
    const payload = sessionEvent('checkout.session.expired', { status: 'expired', payment_status: 'unpaid' });
    expect((await sendWebhook(payload)).status).toBe(200);
    expect(db.state.orders.get('order-1')?.status).toBe('payment_failed');
    expect(db.state.stock.get('prod-1')).toBe(7);
  });

  it('acknowledges unrelated events without touching orders', async () => {
    const payload = JSON.stringify({ id: 'evt_x', object: 'event', type: 'customer.created', data: { object: {} } });
    expect((await sendWebhook(payload)).status).toBe(200);
    expect(db.state.orders.get('order-1')?.status).toBe('pending_payment');
  });
});

describe('GET /payment/result', () => {
  it('does not trust a missing or forged session id', async () => {
    const res = await request(app).get('/payment/result?success=true');
    expect(res.status).toBe(400);
  });
});

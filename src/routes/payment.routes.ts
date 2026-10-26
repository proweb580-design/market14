import express, { Router, Request, Response } from 'express';
import { formatUzs } from '../data/mockProducts';
import { getOrderById } from '../services/order.service';
import {
  applyCheckoutSession,
  constructWebhookEvent,
  handleStripeEvent,
  isStripeConfigured,
  retrieveCheckoutSession,
} from '../services/payment.service';

// Mounted before express.json(): signature verification needs the raw request body
export const paymentWebhookRouter = Router();

// POST /payments/stripe/webhook (T-081)
paymentWebhookRouter.post(
  '/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      return res.status(400).json({ received: false, message: 'Missing Stripe-Signature header' });
    }

    let event;
    try {
      const payload = Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
      event = constructWebhookEvent(payload, signature);
    } catch (err: any) {
      console.warn('[Stripe] Webhook signature verification failed:', err.message);
      return res.status(400).json({ received: false, message: 'Invalid signature' });
    }

    try {
      await handleStripeEvent(event);
      res.json({ received: true });
    } catch (err: any) {
      // 5xx makes Stripe retry the delivery later
      console.error('[Stripe] Webhook handling failed:', err.message);
      res.status(500).json({ received: false });
    }
  }
);

export const paymentRouter = Router();

// GET /payment/result — status re-checked on the server via the Stripe API
paymentRouter.get('/payment/result', async (req: Request, res: Response) => {
  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
  const cancelled = req.query.cancelled === '1';

  const renderResult = (status: number, data: Record<string, unknown>) =>
    res.status(status).render('pages/payment-result', {
      title: 'Результат оплаты | TashTech',
      formatUzs,
      activeNav: '',
      order: null,
      outcome: 'unknown',
      cancelled,
      retryUrl: null,
      ...data,
    });

  if (!sessionId.startsWith('cs_') || !isStripeConfigured()) {
    return renderResult(400, {});
  }

  try {
    const session = await retrieveCheckoutSession(sessionId);
    const outcome = await applyCheckoutSession(session);

    const orderId = session.metadata?.orderId || session.client_reference_id;
    const order = orderId ? await getOrderById(orderId, req.session.user?.id) : null;

    renderResult(200, {
      order,
      outcome,
      retryUrl: outcome === 'pending' && session.status === 'open' ? session.url : null,
    });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN_ORDER_ACCESS') {
      return renderResult(403, {});
    }
    console.error('[Stripe] Payment result check failed:', err.message);
    renderResult(502, {});
  }
});

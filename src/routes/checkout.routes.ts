import { Router, Request, Response } from 'express';
import { formatUzs } from '../data/mockProducts';

export const checkoutRouter = Router();

// GET /checkout
checkoutRouter.get('/checkout', (req: Request, res: Response) => {
  res.render('pages/checkout', {
    title: 'Оформление заказа с доставкой по Ташкенту | TashTech',
    formatUzs,
    activeNav: 'cart'
  });
});

// GET /checkout/success
checkoutRouter.get('/checkout/success', (req: Request, res: Response) => {
  const orderNumber = (req.query.orderNumber as string) || `TT-${Math.floor(100000 + Math.random() * 900000)}`;
  res.render('pages/checkout-success', {
    title: 'Заказ успешно оформлен | TashTech Ташкент',
    orderNumber,
    formatUzs,
    activeNav: ''
  });
});

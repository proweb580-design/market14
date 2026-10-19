import { Router, Request, Response } from 'express';
import { formatUzs } from '../data/mockProducts';

export const authRouter = Router();

// Mock default user
export const DEMO_USER = {
  name: 'Азиз Каримов',
  email: 'aziz.karimov@example.uz',
  phone: '+998 (90) 123-45-67',
  city: 'Ташкент, Юнусабадский район',
  registeredAt: '15 января 2025'
};

export const DEMO_ORDERS = [
  {
    orderNumber: 'TT-742910',
    date: '14 февраля 2025',
    status: 'delivered',
    statusText: 'Доставлен',
    totalUzs: 16900000,
    items: [
      {
        title: 'Apple iPhone 16 Pro Max 256GB Black Titanium',
        quantity: 1,
        priceUzs: 16900000,
        image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
      }
    ],
    deliveryAddress: 'г. Ташкент, Юнусабад, 4-й квартал, дом 18, кв. 42',
    paymentMethod: 'Uzcard при получении'
  },
  {
    orderNumber: 'TT-619280',
    date: '02 января 2025',
    status: 'delivered',
    statusText: 'Доставлен',
    totalUzs: 4200000,
    items: [
      {
        title: 'Sony WH-1000XM5 Wireless Noise Cancelling Black',
        quantity: 1,
        priceUzs: 4200000,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80'
      }
    ],
    deliveryAddress: 'г. Ташкент, Мирзо-Улугбекский р-н, ул. Мустакиллик, 24',
    paymentMethod: 'Оплата картой онлайн'
  }
];

// GET /login
authRouter.get('/login', (req: Request, res: Response) => {
  res.render('pages/login', {
    title: 'Вход в личный кабинет | TashTech',
    activeNav: 'account'
  });
});

// POST /login (mock login)
authRouter.post('/login', (req: Request, res: Response) => {
  res.redirect('/account');
});

// GET /register
authRouter.get('/register', (req: Request, res: Response) => {
  res.render('pages/register', {
    title: 'Регистрация аккаунта | TashTech',
    activeNav: 'account'
  });
});

// POST /register (mock register)
authRouter.post('/register', (req: Request, res: Response) => {
  res.redirect('/account');
});

// GET /logout
authRouter.get('/logout', (req: Request, res: Response) => {
  res.redirect('/');
});

// GET /account
authRouter.get('/account', (req: Request, res: Response) => {
  res.render('pages/account', {
    title: 'Личный кабинет покупателя | TashTech',
    user: DEMO_USER,
    demoOrders: DEMO_ORDERS,
    formatUzs,
    activeNav: 'account',
    activeTab: 'orders'
  });
});

// GET /account/orders
authRouter.get('/account/orders', (req: Request, res: Response) => {
  res.render('pages/account', {
    title: 'Мои заказы | TashTech',
    user: DEMO_USER,
    demoOrders: DEMO_ORDERS,
    formatUzs,
    activeNav: 'account',
    activeTab: 'orders'
  });
});

import { Router, Request, Response, NextFunction } from 'express';
import passport, { isGoogleAuthAvailable } from '../config/passport';
import {
  registerUser,
  loginUser,
  findOrCreateGoogleUser,
  UserSessionData,
} from '../services/auth.service';
import { getUserOrders } from '../services/order.service';
import { mergeGuestCart } from '../services/cart.service';
import { requireAuth } from '../middleware/auth';
import { formatUzs } from '../data/mockProducts';

export const authRouter = Router();

// GET /login
authRouter.get('/login', (req: Request, res: Response) => {
  if (req.session?.user) {
    return res.redirect('/account');
  }

  const error = req.query.error as string | undefined;
  const redirectUrl = (req.query.redirect as string) || '/account';

  res.render('pages/login', {
    title: 'Вход в личный кабинет | TashTech',
    activeNav: 'account',
    error,
    redirectUrl,
  });
});

// POST /login (T-070, T-072)
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password, redirectUrl, guestCart } = req.body;

  try {
    const user = await loginUser(email, password);
    req.session.user = user;

    // Merge guest cart if sent in body or session (T-072)
    if (guestCart) {
      try {
        const parsedCart = typeof guestCart === 'string' ? JSON.parse(guestCart) : guestCart;
        await mergeGuestCart(user.id, parsedCart);
      } catch (e) {
        // ignore JSON parse issue
      }
    }

    req.session.save(() => {
      res.redirect(redirectUrl || '/account');
    });
  } catch (err: any) {
    res.render('pages/login', {
      title: 'Вход в личный кабинет | TashTech',
      activeNav: 'account',
      error: err.message || 'Ошибка входа',
      redirectUrl: redirectUrl || '/account',
      savedEmail: email,
    });
  }
});

// GET /register
authRouter.get('/register', (req: Request, res: Response) => {
  if (req.session?.user) {
    return res.redirect('/account');
  }

  res.render('pages/register', {
    title: 'Регистрация аккаунта | TashTech',
    activeNav: 'account',
    error: undefined,
  });
});

// POST /register (T-070)
authRouter.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, phone, guestCart } = req.body;

  try {
    if (!password || password.length < 6) {
      throw new Error('Пароль должен содержать не менее 6 символов');
    }

    const user = await registerUser({ name, email, password, phone });
    req.session.user = user;

    if (guestCart) {
      try {
        const parsedCart = typeof guestCart === 'string' ? JSON.parse(guestCart) : guestCart;
        await mergeGuestCart(user.id, parsedCart);
      } catch (e) {
        // ignore
      }
    }

    req.session.save(() => {
      res.redirect('/account');
    });
  } catch (err: any) {
    res.render('pages/register', {
      title: 'Регистрация аккаунта | TashTech',
      activeNav: 'account',
      error: err.message || 'Ошибка регистрации',
      savedName: name,
      savedEmail: email,
      savedPhone: phone,
    });
  }
});

// Google OAuth Trigger (T-071)
authRouter.get('/auth/google', (req: Request, res: Response, next: NextFunction) => {
  if (isGoogleAuthAvailable) {
    return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  }

  // Graceful 1-click Google OAuth demo flow when Google credentials are not in .env
  findOrCreateGoogleUser({
    googleId: 'google-demo-12345',
    email: 'aziz.google@gmail.com',
    name: 'Азиз Каримов (Google)',
  })
    .then((user) => {
      req.session.user = user;
      req.session.save(() => {
        res.redirect('/account');
      });
    })
    .catch(next);
});

// Google OAuth Callback (T-071)
authRouter.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_failed' }),
  (req: Request, res: Response) => {
    if (req.user) {
      req.session.user = req.user as UserSessionData;
    }
    res.redirect('/account');
  }
);

// GET /logout & POST /logout
authRouter.all('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// GET /account (T-074: Protected Route)
authRouter.get('/account', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = req.session.user!;
    const userOrders = await getUserOrders(currentUser.id);

    res.render('pages/account', {
      title: 'Личный кабинет покупателя | TashTech',
      user: currentUser,
      demoOrders: userOrders,
      formatUzs,
      activeNav: 'account',
      activeTab: 'orders',
    });
  } catch (error) {
    next(error);
  }
});

// GET /account/orders (T-074: Protected Route)
authRouter.get('/account/orders', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = req.session.user!;
    const userOrders = await getUserOrders(currentUser.id);

    res.render('pages/account', {
      title: 'Мои заказы | TashTech',
      user: currentUser,
      demoOrders: userOrders,
      formatUzs,
      activeNav: 'account',
      activeTab: 'orders',
    });
  } catch (error) {
    next(error);
  }
});

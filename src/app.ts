import express, { Request, Response, NextFunction } from 'express';
import 'ejs';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import passport from './config/passport';
import { populateUser } from './middleware/auth';
import { homeRouter } from './routes/home.routes';
import { catalogRouter } from './routes/catalog.routes';
import { shopRouter } from './routes/shop.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { authRouter } from './routes/auth.routes';
import { paymentRouter, paymentWebhookRouter } from './routes/payment.routes';
import { config } from './config/env';

export const app = express();

// Trust reverse proxy for Vercel / HTTPS cookies
app.set('trust proxy', 1);

// Robust multi-environment view path resolution
const possibleViewsDirs = [
  path.join(process.cwd(), 'views'),
  path.join(__dirname, '../views'),
  path.join(__dirname, 'views'),
  path.resolve(__dirname, '../../views'),
];
const resolvedViewsDir =
  possibleViewsDirs.find((dir) => fs.existsSync(dir)) || path.join(process.cwd(), 'views');

app.set('views', resolvedViewsDir);
app.set('view engine', 'ejs');

// Stripe webhook needs the raw body, so it goes before the JSON parser (T-081)
app.use('/', paymentWebhookRouter);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Robust static files directory resolution
const possiblePublicDirs = [
  path.join(process.cwd(), 'public'),
  path.join(__dirname, '../public'),
  path.join(__dirname, 'public'),
];
const resolvedPublicDir =
  possiblePublicDirs.find((dir) => fs.existsSync(dir)) || path.join(process.cwd(), 'public');

app.use(express.static(resolvedPublicDir));
app.use('/public', express.static(resolvedPublicDir));

// Server sessions (T-070)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'tashtech_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(populateUser);

// Global locals for templates
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.siteName = config.siteName;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.activeNav = '';
  next();
});

// Routes
app.use('/', homeRouter);
app.use('/', catalogRouter);
app.use('/', shopRouter);
app.use('/', checkoutRouter);
app.use('/', paymentRouter);
app.use('/', authRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).render('pages/404', {
    title: '404 — Страница не найдена | TashTech',
    url: req.originalUrl,
    activeNav: '',
  });
});

// Global error handler with safe fallback for serverless hosting
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  try {
    res.status(500).render('pages/500', {
      title: '500 — Внутренняя ошибка сервера | TashTech',
      error: config.env === 'development' ? err.message : 'Произошла непредвиденная ошибка.',
      activeNav: '',
    });
  } catch (renderError) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="utf-8">
          <title>500 — Ошибка сервера | TashTech</title>
          <style>
            body { background: #0B0D12; color: #F5F7FB; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #131720; border: 1px solid rgba(255,255,255,0.08); padding: 2.5rem; border-radius: 16px; max-width: 500px; text-align: center; }
            h1 { color: #FF647C; margin-top: 0; }
            p { color: #9AA4B2; line-height: 1.6; }
            a { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #7C6CFF; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>500 — Ошибка сервера</h1>
            <p>${err?.message || 'Сервис временно недоступен.'}</p>
            <a href="/">На главную</a>
          </div>
        </body>
      </html>
    `);
  }
});

export default app;

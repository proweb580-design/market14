import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import session from 'express-session';
import passport from './config/passport';
import { populateUser } from './middleware/auth';
import { homeRouter } from './routes/home.routes';
import { catalogRouter } from './routes/catalog.routes';
import { shopRouter } from './routes/shop.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { authRouter } from './routes/auth.routes';
import { config } from './config/env';

export const app = express();

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

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
app.use('/', authRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).render('pages/404', {
    title: '404 — Страница не найдена | TashTech',
    url: req.originalUrl,
    activeNav: ''
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).render('pages/500', {
    title: '500 — Внутренняя ошибка сервера | TashTech',
    error: config.env === 'development' ? err.message : 'Произошла непредвиденная ошибка.',
    activeNav: ''
  });
});

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { homeRouter } from './routes/home.routes';
import { catalogRouter } from './routes/catalog.routes';
import { config } from './config/env';

export const app = express();

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

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

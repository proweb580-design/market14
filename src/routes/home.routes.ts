import { Router, Request, Response } from 'express';
import {
  getCategories,
  getFeaturedProducts,
  getNewArrivals,
  getTotalProductsCount
} from '../services/catalog.service';
import { formatUzs } from '../data/mockProducts';

export const homeRouter = Router();

homeRouter.get('/', async (req: Request, res: Response, next) => {
  try {
    const [categories, featured, newArrivals, allProductsCount] = await Promise.all([
      getCategories(),
      getFeaturedProducts(6),
      getNewArrivals(4),
      getTotalProductsCount(),
    ]);

    res.render('pages/home', {
      title: 'TashTech — Премиальный магазин цифровой техники в Ташкенте',
      categories,
      featured,
      newArrivals,
      allProductsCount,
      formatUzs,
      activeNav: 'home'
    });
  } catch (error) {
    next(error);
  }
});

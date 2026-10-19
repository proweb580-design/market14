import { Router, Request, Response } from 'express';
import {
  getAllCategories,
  getFeaturedProducts,
  getNewArrivals,
  MOCK_PRODUCTS,
  formatUzs
} from '../data/mockProducts';

export const homeRouter = Router();

homeRouter.get('/', (req: Request, res: Response) => {
  const categories = getAllCategories();
  const featured = getFeaturedProducts();
  const newArrivals = getNewArrivals();

  res.render('pages/home', {
    title: 'TashTech — Премиальный магазин цифровой техники в Ташкенте',
    categories,
    featured,
    newArrivals,
    allProductsCount: MOCK_PRODUCTS.length,
    formatUzs,
    activeNav: 'home'
  });
});

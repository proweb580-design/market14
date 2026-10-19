import { Router, Request, Response } from 'express';
import { MOCK_PRODUCTS, formatUzs } from '../data/mockProducts';

export const shopRouter = Router();

// GET /cart
shopRouter.get('/cart', (req: Request, res: Response) => {
  res.render('pages/cart', {
    title: 'Корзина покупок | TashTech Ташкент',
    formatUzs,
    activeNav: 'cart'
  });
});

// GET /favorites
shopRouter.get('/favorites', (req: Request, res: Response) => {
  res.render('pages/favorites', {
    title: 'Избранные товары | TashTech Ташкент',
    formatUzs,
    activeNav: 'favorites'
  });
});

// GET /compare
shopRouter.get('/compare', (req: Request, res: Response) => {
  res.render('pages/compare', {
    title: 'Сравнение характеристик моделей | TashTech Ташкент',
    formatUzs,
    activeNav: 'compare'
  });
});

// JSON API: GET /api/products
shopRouter.get('/api/products', (req: Request, res: Response) => {
  const idsParam = req.query.ids;
  if (typeof idsParam === 'string' && idsParam.trim()) {
    const idList = idsParam.split(',').map(s => s.trim());
    const matched = MOCK_PRODUCTS.filter(p => idList.includes(p.id));
    return res.json({ success: true, products: matched });
  }

  res.json({ success: true, products: MOCK_PRODUCTS });
});

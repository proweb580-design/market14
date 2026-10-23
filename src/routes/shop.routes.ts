import { Router, Request, Response } from 'express';
import { MOCK_PRODUCTS, formatUzs } from '../data/mockProducts';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  mergeGuestCart,
  toggleFavorite,
  getUserFavorites,
} from '../services/cart.service';

export const shopRouter = Router();

// GET /cart
shopRouter.get('/cart', (req: Request, res: Response) => {
  res.render('pages/cart', {
    title: 'Корзина покупок | TashTech Ташкент',
    formatUzs,
    activeNav: 'cart',
    currentUser: req.session.user || null,
  });
});

// GET /favorites
shopRouter.get('/favorites', (req: Request, res: Response) => {
  res.render('pages/favorites', {
    title: 'Избранные товары | TashTech Ташкент',
    formatUzs,
    activeNav: 'favorites',
    currentUser: req.session.user || null,
  });
});

// GET /compare
shopRouter.get('/compare', (req: Request, res: Response) => {
  res.render('pages/compare', {
    title: 'Сравнение характеристик моделей | TashTech Ташкент',
    formatUzs,
    activeNav: 'compare',
    currentUser: req.session.user || null,
  });
});

// JSON API: GET /api/products
shopRouter.get('/api/products', (req: Request, res: Response) => {
  const idsParam = req.query.ids;
  if (typeof idsParam === 'string' && idsParam.trim()) {
    const idList = idsParam.split(',').map((s) => s.trim());
    const matched = MOCK_PRODUCTS.filter((p) => idList.includes(p.id));
    return res.json({ success: true, products: matched });
  }

  res.json({ success: true, products: MOCK_PRODUCTS });
});

// API: GET /api/cart (T-072)
shopRouter.get('/api/cart', async (req: Request, res: Response) => {
  try {
    const userId = req.session.user?.id;
    const sessionId = req.sessionID;
    const cart = await getCart(userId, sessionId);
    res.json({ success: true, cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API: POST /api/cart/items (T-072)
shopRouter.post('/api/cart/items', async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.session.user?.id;
    const sessionId = req.sessionID;

    const result = await addToCart(productId, parseInt(quantity, 10), userId, sessionId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    const updatedCart = await getCart(userId, sessionId);
    res.json({ success: true, cart: updatedCart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API: PATCH /api/cart/items/:id (T-072)
shopRouter.patch('/api/cart/items/:id', async (req: Request, res: Response) => {
  try {
    const { quantity } = req.body;
    const result = await updateCartItemQuantity(req.params.id, parseInt(quantity, 10));
    if (!result.success) {
      return res.status(400).json(result);
    }
    const cart = await getCart(req.session.user?.id, req.sessionID);
    res.json({ success: true, cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API: DELETE /api/cart/items/:id (T-072)
shopRouter.delete('/api/cart/items/:id', async (req: Request, res: Response) => {
  try {
    await removeCartItem(req.params.id);
    const cart = await getCart(req.session.user?.id, req.sessionID);
    res.json({ success: true, cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API: POST /api/cart/sync (T-072: Merge guest cart after login)
shopRouter.post('/api/cart/sync', async (req: Request, res: Response) => {
  try {
    const { items = [] } = req.body;
    const userId = req.session.user?.id;
    if (userId && items.length > 0) {
      await mergeGuestCart(userId, items);
    }
    const cart = await getCart(userId, req.sessionID);
    res.json({ success: true, cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API: POST /api/favorites/:productId (T-072)
shopRouter.post('/api/favorites/:productId', async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.json({ success: true, isFavorite: true, guest: true });
    }

    const result = await toggleFavorite(userId, productId);
    res.json({ success: true, isFavorite: result.isFavorite });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API: GET /api/favorites (T-072)
shopRouter.get('/api/favorites', async (req: Request, res: Response) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.json({ success: true, favorites: [] });
    }
    const favorites = await getUserFavorites(userId);
    res.json({ success: true, favorites });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

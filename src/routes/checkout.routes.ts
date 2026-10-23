import { Router, Request, Response } from 'express';
import { formatUzs } from '../data/mockProducts';
import { createOrder, getOrderById } from '../services/order.service';

export const checkoutRouter = Router();

// GET /checkout
checkoutRouter.get('/checkout', (req: Request, res: Response) => {
  res.render('pages/checkout', {
    title: 'Оформление заказа с доставкой по Ташкенту | TashTech',
    formatUzs,
    activeNav: 'cart',
    currentUser: req.session.user || null,
  });
});

// POST /checkout & POST /api/orders (T-073: Transactional Order Creation with Stock Validation)
checkoutRouter.post(['/checkout', '/api/orders'], async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryType = 'courier',
      deliveryDistrict,
      deliveryStreet,
      deliveryApt,
      deliveryNotes,
      paymentMethod = 'Uzcard / Humo при получении',
      items = [],
    } = req.body;

    // Normalize items
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    if (!parsedItems || parsedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Корзина пуста — добавьте товары перед оформлением',
      });
    }

    const order = await createOrder({
      userId: req.session.user?.id,
      customerName: customerName || req.session.user?.name || 'Покупатель',
      customerPhone: customerPhone || req.session.user?.phone || '+998 (90) 000-00-00',
      customerEmail: customerEmail || req.session.user?.email,
      deliveryType,
      deliveryDistrict,
      deliveryStreet,
      deliveryApt,
      deliveryNotes,
      paymentMethod,
      items: parsedItems.map((i: any) => ({
        productId: i.productId || i.id,
        quantity: parseInt(i.quantity || '1', 10),
      })),
    });

    // If client requested JSON (AJAX / fetch)
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        orderNumber: order.orderNumber,
        totalUzs: order.totalUzs,
        order,
      });
    }

    // Default form post redirect
    res.redirect(`/checkout/success?orderNumber=${order.orderNumber}&total=${order.totalUzs}`);
  } catch (error: any) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при оформлении заказа',
      });
    }

    res.status(400).render('pages/checkout', {
      title: 'Оформление заказа | TashTech',
      error: error.message || 'Ошибка оформления заказа',
      formatUzs,
      activeNav: 'cart',
      currentUser: req.session.user || null,
    });
  }
});

// GET /checkout/success
checkoutRouter.get('/checkout/success', async (req: Request, res: Response) => {
  const orderNumber = (req.query.orderNumber as string) || `TT-${Math.floor(100000 + Math.random() * 900000)}`;
  const order = await getOrderById(orderNumber, req.session.user?.id);

  res.render('pages/checkout-success', {
    title: 'Заказ успешно оформлен | TashTech Ташкент',
    orderNumber,
    order,
    formatUzs,
    activeNav: '',
  });
});

// GET /api/orders/:orderId (T-074: Protected Order Access)
checkoutRouter.get('/api/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const currentUserId = req.session.user?.id;

    const order = await getOrderById(orderId, currentUserId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Заказ не найден' });
    }

    res.json({ success: true, order });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN_ORDER_ACCESS') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещён: этот заказ принадлежит другому пользователю',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

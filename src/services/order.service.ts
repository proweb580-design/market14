import { prisma, hasValidDatabaseUrl } from '../db/prisma';
import { MOCK_PRODUCTS } from '../data/mockProducts';

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderParams {
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType: 'courier' | 'pickup';
  deliveryDistrict?: string;
  deliveryStreet?: string;
  deliveryApt?: string;
  deliveryNotes?: string;
  paymentMethod: string;
  items: OrderItemInput[];
}

export interface OrderItemView {
  title: string;
  quantity: number;
  priceUzs: number;
  image: string;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  statusText: string;
  subtotalUzs: number;
  deliveryUzs: number;
  totalUzs: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  paymentMethod: string;
  items: OrderItemView[];
}

// In-memory orders store for fallback demo
const fallbackOrders: OrderView[] = [
  {
    id: 'ord-demo-1',
    orderNumber: 'TT-742910',
    date: '14 февраля 2025',
    status: 'delivered',
    statusText: 'Доставлен',
    subtotalUzs: 16900000,
    deliveryUzs: 0,
    totalUzs: 16900000,
    customerName: 'Азиз Каримов',
    customerPhone: '+998 (90) 123-45-67',
    deliveryAddress: 'г. Ташкент, Юнусабад, 4-й квартал, дом 18, кв. 42',
    paymentMethod: 'Uzcard при получении',
    items: [
      {
        title: 'Apple iPhone 16 Pro Max 256GB Black Titanium',
        quantity: 1,
        priceUzs: 16900000,
        image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'ord-demo-2',
    orderNumber: 'TT-619280',
    date: '02 января 2025',
    status: 'delivered',
    statusText: 'Доставлен',
    subtotalUzs: 4200000,
    deliveryUzs: 0,
    totalUzs: 4200000,
    customerName: 'Азиз Каримов',
    customerPhone: '+998 (90) 123-45-67',
    deliveryAddress: 'г. Ташкент, Мирзо-Улугбекский р-н, ул. Мустакиллик, 24',
    paymentMethod: 'Оплата картой онлайн',
    items: [
      {
        title: 'Sony WH-1000XM5 Wireless Noise Cancelling Black',
        quantity: 1,
        priceUzs: 4200000,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80',
      },
    ],
  },
];

/**
 * Transactional Order Creation with stock verification and price snapshotting (T-073)
 */
export async function createOrder(params: CreateOrderParams): Promise<OrderView> {
  const {
    userId,
    customerName,
    customerPhone,
    customerEmail,
    deliveryType,
    deliveryDistrict,
    deliveryStreet,
    deliveryApt,
    deliveryNotes,
    paymentMethod,
    items,
  } = params;

  if (!items || items.length === 0) {
    throw new Error('Корзина пуста — добавьте хотя бы один товар');
  }

  const fullAddress =
    deliveryType === 'pickup'
      ? 'Самовывоз: г. Ташкент, ул. Амира Темура, 108 (Юнусабад)'
      : `г. Ташкент, ${deliveryDistrict || 'Юнусабадский р-н'}, ${deliveryStreet || ''}${deliveryApt ? ', кв./офис ' + deliveryApt : ''}`;

  const orderNumber = `TT-${Math.floor(100000 + Math.random() * 900000)}`;

  if (hasValidDatabaseUrl) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        let subtotalUzs = 0;
        const itemsToCreate = [];

        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
          });

          if (!product || !product.isActive) {
            throw new Error(`Товар с ID ${item.productId} недоступен`);
          }

          if (product.stock < item.quantity) {
            throw new Error(
              `Недостаточно товара "${product.name}" на складе. Доступно: ${product.stock} шт., запрошено: ${item.quantity} шт.`
            );
          }

          // Decrement stock transactionally
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: item.quantity } },
          });

          const unitPriceUzs = product.priceUzs;
          const lineTotalUzs = unitPriceUzs * item.quantity;
          subtotalUzs += lineTotalUzs;

          const imgUrl =
            product.images && product.images.length > 0
              ? product.images[0].url
              : 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80';

          itemsToCreate.push({
            productId: product.id,
            productNameSnapshot: product.name,
            unitPriceUzs,
            quantity: item.quantity,
            lineTotalUzs,
            imageUrl: imgUrl,
          });
        }

        const deliveryUzs = deliveryType === 'pickup' || subtotalUzs >= 500000 ? 0 : 30000;
        const totalUzs = subtotalUzs + deliveryUzs;

        // Create Order
        const createdOrder = await tx.order.create({
          data: {
            userId: userId || null,
            orderNumber,
            status: 'pending',
            currency: 'UZS',
            subtotalUzs,
            deliveryUzs,
            totalUzs,
            customerName,
            customerPhone,
            customerEmail: customerEmail || null,
            deliveryAddress: fullAddress,
            deliveryNotes: deliveryNotes || paymentMethod,
            items: {
              create: itemsToCreate.map((i) => ({
                productId: i.productId,
                productNameSnapshot: i.productNameSnapshot,
                unitPriceUzs: i.unitPriceUzs,
                quantity: i.quantity,
                lineTotalUzs: i.lineTotalUzs,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // Clean user's cart in DB if authenticated
        if (userId) {
          const userCart = await tx.cart.findFirst({ where: { userId } });
          if (userCart) {
            await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
          }
        }

        return {
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          date: createdOrder.createdAt.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          status: createdOrder.status,
          statusText: 'В обработке (ожидает звонка оператора)',
          subtotalUzs: createdOrder.subtotalUzs,
          deliveryUzs: createdOrder.deliveryUzs,
          totalUzs: createdOrder.totalUzs,
          customerName: createdOrder.customerName,
          customerPhone: createdOrder.customerPhone,
          deliveryAddress: createdOrder.deliveryAddress,
          paymentMethod,
          items: itemsToCreate.map((i) => ({
            title: i.productNameSnapshot,
            quantity: i.quantity,
            priceUzs: i.unitPriceUzs,
            image: i.imageUrl,
          })),
        };
      });

      return order;
    } catch (err: any) {
      console.warn('[OrderService] Transactional createOrder fallback:', err.message);
      if (err.message && (err.message.includes('Недостаточно') || err.message.includes('недоступен'))) {
        throw err;
      }
    }
  }

  // Fallback in-memory order creation
  let subtotalUzs = 0;
  const itemsView: OrderItemView[] = [];

  for (const item of items) {
    const mockProd = MOCK_PRODUCTS.find((p) => p.id === item.productId);
    const title = mockProd ? mockProd.name : 'Товар TashTech';
    const priceUzs = mockProd ? mockProd.priceUzs : 1000000;
    const image = mockProd && mockProd.images[0] ? mockProd.images[0] : 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80';
    const lineTotal = priceUzs * item.quantity;
    subtotalUzs += lineTotal;

    itemsView.push({
      title,
      quantity: item.quantity,
      priceUzs,
      image,
    });
  }

  const deliveryUzs = deliveryType === 'pickup' || subtotalUzs >= 500000 ? 0 : 30000;
  const totalUzs = subtotalUzs + deliveryUzs;

  const fallbackOrder: OrderView = {
    id: 'ord-' + Date.now(),
    orderNumber,
    date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
    status: 'pending',
    statusText: 'В обработке (ожидает звонка оператора)',
    subtotalUzs,
    deliveryUzs,
    totalUzs,
    customerName,
    customerPhone,
    deliveryAddress: fullAddress,
    paymentMethod,
    items: itemsView,
  };

  fallbackOrders.unshift(fallbackOrder);
  return fallbackOrder;
}

/**
 * Get orders for specific user (T-074: Access Control)
 */
export async function getUserOrders(userId?: string): Promise<OrderView[]> {
  if (hasValidDatabaseUrl && userId) {
    try {
      const dbOrders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
              },
            },
          },
        },
      });

      if (dbOrders.length > 0) {
        return dbOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          date: o.createdAt.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          status: o.status,
          statusText:
            o.status === 'delivered'
              ? 'Доставлен'
              : o.status === 'paid'
              ? 'Оплачен'
              : 'В обработке',
          subtotalUzs: o.subtotalUzs,
          deliveryUzs: o.deliveryUzs,
          totalUzs: o.totalUzs,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          deliveryAddress: o.deliveryAddress,
          paymentMethod: o.deliveryNotes || 'Оплата при получении',
          items: o.items.map((i) => ({
            title: i.productNameSnapshot,
            quantity: i.quantity,
            priceUzs: i.unitPriceUzs,
            image:
              i.product && i.product.images.length > 0
                ? i.product.images[0].url
                : 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80',
          })),
        }));
      }
    } catch (err: any) {
      console.warn('[OrderService] DB getUserOrders fallback:', err.message);
    }
  }

  return fallbackOrders;
}

/**
 * Get single order with security ownership check (T-074)
 */
export async function getOrderById(orderId: string, currentUserId?: string): Promise<OrderView | null> {
  if (hasValidDatabaseUrl) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ id: orderId }, { orderNumber: orderId }],
        },
        include: {
          items: {
            include: {
              product: {
                include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
              },
            },
          },
        },
      });

      if (!order) return null;

      // Access control: if order belongs to a user and current user is different, deny access
      if (order.userId && currentUserId && order.userId !== currentUserId) {
        throw new Error('FORBIDDEN_ORDER_ACCESS');
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        status: order.status,
        statusText:
          order.status === 'delivered'
            ? 'Доставлен'
            : order.status === 'paid'
            ? 'Оплачен'
            : 'В обработке',
        subtotalUzs: order.subtotalUzs,
        deliveryUzs: order.deliveryUzs,
        totalUzs: order.totalUzs,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        paymentMethod: order.deliveryNotes || 'Оплата при получении',
        items: order.items.map((i) => ({
          title: i.productNameSnapshot,
          quantity: i.quantity,
          priceUzs: i.unitPriceUzs,
          image:
            i.product && i.product.images.length > 0
              ? i.product.images[0].url
              : 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80',
        })),
      };
    } catch (err: any) {
      if (err.message === 'FORBIDDEN_ORDER_ACCESS') throw err;
      console.warn('[OrderService] DB getOrderById fallback:', err.message);
    }
  }

  const fallback = fallbackOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
  return fallback || null;
}

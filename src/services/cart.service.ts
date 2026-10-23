import { prisma, hasValidDatabaseUrl } from '../db/prisma';
import { MOCK_PRODUCTS } from '../data/mockProducts';

export interface CartItemResponse {
  id: string;
  productId: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
  lineTotal: number;
}

export interface CartSummaryResponse {
  items: CartItemResponse[];
  itemsCount: number;
  subtotalUzs: number;
  deliveryUzs: number;
  totalUzs: number;
}

/**
 * Get or create Cart record for user or session
 */
async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (!userId && !sessionId) return null;

  if (userId) {
    let cart = await prisma.cart.findFirst({
      where: { userId },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }
    return cart;
  }

  let cart = await prisma.cart.findFirst({
    where: { sessionId },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { sessionId },
    });
  }
  return cart;
}

/**
 * Get Cart with calculations
 */
export async function getCart(userId?: string, sessionId?: string): Promise<CartSummaryResponse> {
  if (hasValidDatabaseUrl && (userId || sessionId)) {
    try {
      const cart = await prisma.cart.findFirst({
        where: userId ? { userId } : { sessionId },
        include: {
          items: {
            include: {
              product: {
                include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (cart && cart.items.length > 0) {
        let subtotal = 0;
        let count = 0;

        const items: CartItemResponse[] = cart.items.map((item) => {
          const product = item.product;
          const price = product ? product.priceUzs : 0;
          const lineTotal = price * item.quantity;
          subtotal += lineTotal;
          count += item.quantity;

          const image =
            product && product.images && product.images.length > 0
              ? product.images[0].url
              : 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80';

          return {
            id: item.id,
            productId: item.productId,
            title: product ? product.name : 'Товар',
            brand: product ? product.brand : '',
            price,
            image,
            quantity: item.quantity,
            stock: product ? product.stock : 0,
            lineTotal,
          };
        });

        const deliveryUzs = subtotal >= 500000 || subtotal === 0 ? 0 : 30000;
        return {
          items,
          itemsCount: count,
          subtotalUzs: subtotal,
          deliveryUzs,
          totalUzs: subtotal + deliveryUzs,
        };
      }
    } catch (err: any) {
      console.warn('[CartService] DB getCart fallback:', err.message);
    }
  }

  return {
    items: [],
    itemsCount: 0,
    subtotalUzs: 0,
    deliveryUzs: 0,
    totalUzs: 0,
  };
}

/**
 * Add product to cart with stock validation
 */
export async function addToCart(
  productId: string,
  quantity: number = 1,
  userId?: string,
  sessionId?: string
): Promise<{ success: boolean; message?: string }> {
  if (quantity < 1) quantity = 1;

  if (hasValidDatabaseUrl && (userId || sessionId)) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product || !product.isActive) {
        return { success: false, message: 'Товар недоступен для покупки' };
      }

      if (product.stock < quantity) {
        return { success: false, message: `Доступно только ${product.stock} шт.` };
      }

      const cart = await getOrCreateCart(userId, sessionId);
      if (!cart) {
        return { success: false, message: 'Не удалось инициализировать корзину' };
      }

      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > product.stock) {
          return { success: false, message: `На складе осталось только ${product.stock} шт.` };
        }
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQty },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },
        });
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[CartService] DB addToCart fallback:', err.message);
    }
  }

  return { success: true };
}

/**
 * Update quantity for cart item
 */
export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
): Promise<{ success: boolean; message?: string }> {
  if (hasValidDatabaseUrl) {
    try {
      if (quantity <= 0) {
        await prisma.cartItem.delete({ where: { id: itemId } });
        return { success: true };
      }

      const item = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: { product: true },
      });

      if (!item) return { success: false, message: 'Позиция корзины не найдена' };

      if (item.product && quantity > item.product.stock) {
        return { success: false, message: `Максимальный остаток: ${item.product.stock} шт.` };
      }

      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });

      return { success: true };
    } catch (err: any) {
      console.warn('[CartService] DB updateCartItemQuantity error:', err.message);
    }
  }

  return { success: true };
}

/**
 * Remove an item from cart
 */
export async function removeCartItem(itemId: string): Promise<boolean> {
  if (hasValidDatabaseUrl) {
    try {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return true;
    } catch (err: any) {
      console.warn('[CartService] DB removeCartItem error:', err.message);
    }
  }
  return true;
}

/**
 * Merge guest cart into user cart after login (T-072)
 */
export async function mergeGuestCart(
  userId: string,
  guestItems: Array<{ id?: string; productId?: string; quantity?: number }>
): Promise<void> {
  if (!hasValidDatabaseUrl || !guestItems || guestItems.length === 0) return;

  try {
    for (const item of guestItems) {
      const pid = item.productId || item.id;
      const qty = item.quantity || 1;
      if (pid) {
        await addToCart(pid, qty, userId);
      }
    }
  } catch (err: any) {
    console.warn('[CartService] mergeGuestCart error:', err.message);
  }
}

/**
 * Toggle favorite in database (T-072)
 */
export async function toggleFavorite(
  userId: string,
  productId: string
): Promise<{ isFavorite: boolean }> {
  if (hasValidDatabaseUrl) {
    try {
      const existing = await prisma.favorite.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      if (existing) {
        await prisma.favorite.delete({
          where: { id: existing.id },
        });
        return { isFavorite: false };
      } else {
        await prisma.favorite.create({
          data: { userId, productId },
        });
        return { isFavorite: true };
      }
    } catch (err: any) {
      console.warn('[CartService] DB toggleFavorite error:', err.message);
    }
  }

  return { isFavorite: true };
}

/**
 * Get all favorite product IDs for a user
 */
export async function getUserFavorites(userId: string): Promise<string[]> {
  if (hasValidDatabaseUrl) {
    try {
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        select: { productId: true },
      });
      return favorites.map((f) => f.productId);
    } catch (err: any) {
      console.warn('[CartService] DB getUserFavorites error:', err.message);
    }
  }

  return [];
}

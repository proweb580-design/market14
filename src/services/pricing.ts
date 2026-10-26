/**
 * Pure pricing helpers shared by order creation and online payments (T-081, T-082)
 */

export const FREE_DELIVERY_THRESHOLD_UZS = 500000;
export const COURIER_DELIVERY_UZS = 30000;

export type DeliveryType = 'courier' | 'pickup';

export interface PricedLine {
  unitPriceUzs: number;
  quantity: number;
}

export interface OrderTotals {
  subtotalUzs: number;
  deliveryUzs: number;
  totalUzs: number;
}

export function calculateDeliveryUzs(subtotalUzs: number, deliveryType: DeliveryType): number {
  if (deliveryType === 'pickup' || subtotalUzs >= FREE_DELIVERY_THRESHOLD_UZS) return 0;
  return COURIER_DELIVERY_UZS;
}

export function calculateOrderTotals(lines: PricedLine[], deliveryType: DeliveryType): OrderTotals {
  const subtotalUzs = lines.reduce((sum, line) => sum + line.unitPriceUzs * line.quantity, 0);
  const deliveryUzs = calculateDeliveryUzs(subtotalUzs, deliveryType);
  return { subtotalUzs, deliveryUzs, totalUzs: subtotalUzs + deliveryUzs };
}

/**
 * Converts an order total in UZS into Stripe's smallest currency unit.
 * UZS is a two-decimal currency in Stripe (tiyin), other currencies are converted by rate.
 */
export function uzsToStripeAmount(totalUzs: number, currency: string, uzsPerUnit: number): number {
  if (!Number.isFinite(totalUzs) || totalUzs <= 0) {
    throw new Error('Сумма заказа должна быть больше нуля');
  }

  if (currency.toLowerCase() === 'uzs') {
    return Math.round(totalUzs * 100);
  }

  if (!Number.isFinite(uzsPerUnit) || uzsPerUnit <= 0) {
    throw new Error('Некорректный курс конвертации UZS');
  }

  return Math.max(1, Math.round((totalUzs / uzsPerUnit) * 100));
}

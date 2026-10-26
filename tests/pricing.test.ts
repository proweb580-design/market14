import { describe, expect, it } from 'vitest';
import {
  calculateDeliveryUzs,
  calculateOrderTotals,
  uzsToStripeAmount,
  COURIER_DELIVERY_UZS,
} from '../src/services/pricing';

describe('calculateDeliveryUzs', () => {
  it('charges courier delivery below the free threshold', () => {
    expect(calculateDeliveryUzs(499999, 'courier')).toBe(COURIER_DELIVERY_UZS);
  });

  it('is free from 500 000 UZS', () => {
    expect(calculateDeliveryUzs(500000, 'courier')).toBe(0);
  });

  it('is always free for pickup', () => {
    expect(calculateDeliveryUzs(1000, 'pickup')).toBe(0);
  });
});

describe('calculateOrderTotals', () => {
  it('sums line totals and adds delivery', () => {
    const totals = calculateOrderTotals(
      [
        { unitPriceUzs: 150000, quantity: 2 },
        { unitPriceUzs: 50000, quantity: 1 },
      ],
      'courier'
    );
    expect(totals).toEqual({ subtotalUzs: 350000, deliveryUzs: 30000, totalUzs: 380000 });
  });

  it('gives free delivery for an expensive cart', () => {
    const totals = calculateOrderTotals([{ unitPriceUzs: 16900000, quantity: 1 }], 'courier');
    expect(totals.totalUzs).toBe(16900000);
  });

  it('returns zero totals for an empty cart with pickup', () => {
    expect(calculateOrderTotals([], 'pickup')).toEqual({ subtotalUzs: 0, deliveryUzs: 0, totalUzs: 0 });
  });
});

describe('uzsToStripeAmount', () => {
  it('converts UZS to USD cents by rate', () => {
    expect(uzsToStripeAmount(12700000, 'usd', 12700)).toBe(100000);
  });

  it('rounds to the nearest cent', () => {
    expect(uzsToStripeAmount(16900000, 'usd', 12700)).toBe(133071);
  });

  it('uses tiyin (×100) when charging in UZS', () => {
    expect(uzsToStripeAmount(380000, 'UZS', 12700)).toBe(38000000);
  });

  it('rejects non-positive totals and bad rates', () => {
    expect(() => uzsToStripeAmount(0, 'usd', 12700)).toThrow();
    expect(() => uzsToStripeAmount(1000, 'usd', 0)).toThrow();
  });
});

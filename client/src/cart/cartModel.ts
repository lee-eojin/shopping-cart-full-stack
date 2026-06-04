import type { SelectableCartItem } from "./types.ts";

export const FREE_SHIPPING_THRESHOLD = 100_000;
export const SHIPPING_FEE = 3_000;
export const MAX_QUANTITY = 99;
export const MIN_QUANTITY = 1;

export function calcOrderAmount(items: SelectableCartItem[]) {
  return items.filter((item) => item.selected).reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calcShippingFee(orderAmount: number): number {
  if (orderAmount === 0) return 0;
  return orderAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function calcTotal(orderAmount: number, shippingFee: number): number {
  return orderAmount + shippingFee;
}

export function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, quantity));
}

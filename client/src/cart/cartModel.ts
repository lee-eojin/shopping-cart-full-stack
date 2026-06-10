import type { CartItem, SelectableCartItem } from "./types.ts";

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

export function canOrder(orderAmount: number): boolean {
  return orderAmount > 0;
}

export function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, quantity));
}

export interface CartSummary {
  orderAmount: number;
  shippingFee: number;
  total: number;
  remaining: number;
}

// 선택 상태가 반영된 view로부터 주문 요약을 한 번에 계산
export function calcSummary(items: SelectableCartItem[]): CartSummary {
  const orderAmount = calcOrderAmount(items);
  const shippingFee = calcShippingFee(orderAmount);
  const total = calcTotal(orderAmount, shippingFee);
  const remaining = FREE_SHIPPING_THRESHOLD - orderAmount;
  return { orderAmount, shippingFee, total, remaining };
}

export type CartAction =
  | { type: "quantity"; id: number; quantity: number }
  | { type: "remove"; id: number };

// 낙관적 업데이트용 순수 상태 변환
export function applyCartAction(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "quantity":
      return items.map((item) =>
        item.id === action.id ? { ...item, quantity: action.quantity } : item,
      );
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

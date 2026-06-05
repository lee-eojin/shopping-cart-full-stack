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

export function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, quantity));
}

export type CartAction =
  | { type: "quantity"; id: number; quantity: number }
  | { type: "remove"; id: number };

// 낙관적 업데이트용 순수 상태 변환 (서버 응답 전 UI를 미리 반영)
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

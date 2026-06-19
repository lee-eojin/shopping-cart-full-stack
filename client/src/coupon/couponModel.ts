import type { Coupon, AssessedCoupon } from "./type.ts";

export const MAX_COUPONS = 2;

export function toggleSelection(selected: Coupon["id"][], id: Coupon["id"]): Coupon["id"][] {
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  return [...selected, id].slice(-MAX_COUPONS);
}

export function canSelectMore(selected: Coupon["id"][]): boolean {
  return selected.length < MAX_COUPONS;
}

export function forDisplay(coupons: readonly AssessedCoupon[]): AssessedCoupon[] {
  return [...coupons].sort((a, b) => Number(b.applicable) - Number(a.applicable));
}

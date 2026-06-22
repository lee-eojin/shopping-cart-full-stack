import type { AssessedCoupon, CouponId } from "./type.ts";

export const MAX_COUPONS = 2;

export function toggleSelection(selected: readonly CouponId[], id: CouponId): CouponId[] {
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  if (selected.length >= MAX_COUPONS) return [...selected];
  return [...selected, id];
}

export function canSelectMore(selected: readonly CouponId[]): boolean {
  return selected.length < MAX_COUPONS;
}

export function forDisplay(coupons: readonly AssessedCoupon[]): AssessedCoupon[] {
  return [...coupons].sort((a, b) => Number(b.applicable) - Number(a.applicable));
}

import type { Product } from "../product/types";

interface CouponBase {
  id: number;
  code: string;
  description: string;
  expirationDate: string;
}

export interface MinimumOrderAmountRule {
  minimumOrderAmount: number;
}

export interface FixedCoupon extends CouponBase, MinimumOrderAmountRule {
  discountType: "fixed";
  discountAmount: number;
}

export interface BogoCoupon extends CouponBase {
  discountType: "bogo";
  buyQuantity: number;
  getQuantity: number;
  applicableProductIds: Product["id"][];
}

export interface FreeShippingCoupon extends CouponBase, MinimumOrderAmountRule {
  discountType: "freeShipping";
}

export interface PercentageCoupon extends CouponBase {
  discountType: "percentage";
  discountRate: number;
  maximumDiscountAmount: number;
  availableTime: { start: string; end: string };
}

export type Coupon = FixedCoupon | BogoCoupon | FreeShippingCoupon | PercentageCoupon;
export type CouponId = Coupon["id"];
export type CouponDiscountType = Coupon["discountType"];

export type AssessedCoupon = Coupon & {
  applicable: boolean;
  standaloneDiscountAmount: number;
  standaloneBonusProductAmount: number;
  standaloneTotalBenefitAmount: number;
};

export interface PricedCombination {
  couponIds: Coupon["id"][];
  couponDiscountAmount: number;
  bonusProductAmount: number;
  totalBenefitAmount: number;
}

export interface CouponsResponse {
  coupons: AssessedCoupon[];
  primaryPrice: PricedCombination;
}

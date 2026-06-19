interface CouponBase {
  id: number;
  code: string;
  description: string;
  expirationDate: string;
}

export interface FixedCoupon extends CouponBase {
  discountType: "fixed";
  discountAmount: number;
  minimumOrderAmount: number;
}

export interface BogoCoupon extends CouponBase {
  discountType: "bogo";
  buyQuantity: number;
  getQuantity: number;
  applicableProductIds: number[];
}

export interface FreeShippingCoupon extends CouponBase {
  discountType: "freeShipping";
  minimumOrderAmount: number;
}

export interface PercentageCoupon extends CouponBase {
  discountType: "percentage";
  discountRate: number;
  maximumDiscountAmount: number;
  availableTime: { start: string; end: string };
}

export type Coupon = FixedCoupon | BogoCoupon | FreeShippingCoupon | PercentageCoupon;

export type AssessedCoupon = Coupon & { applicable: boolean };

export interface PricedCombination {
  couponIds: Coupon["id"][];
  couponDiscountAmount: number;
}

export interface CouponsResponse {
  coupons: AssessedCoupon[];
  primaryPrice: PricedCombination;
}

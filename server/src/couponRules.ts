import type { Coupon, BogoCoupon, PercentageCoupon, OrderItem, MinimumOrderAmountRule } from "./database.ts";

export interface OrderContext {
  items: readonly OrderItem[];
  isRemoteArea: boolean;
  now: Date;
}

export interface PricedCombination {
  couponIds: Coupon["id"][];
  couponDiscountAmount: number;
}

export interface OrderAmounts {
  orderAmount: number;
  couponDiscountAmount: number;
  shippingFee: number;
  totalPaymentAmount: number;
}

export function calcOrderAmount(items: readonly OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.productPrice * item.productQuantity, 0);
}

export function calcShippingFee(ctx: OrderContext): number {
  if (calcOrderAmount(ctx.items) >= 100_000) return 0;
  return 3_000 + (ctx.isRemoteArea ? 3_000 : 0);
}

function isExpired(coupon: Coupon, now: Date): boolean {
  return now > new Date(`${coupon.expirationDate}T23:59:59`);
}

function isWithinAvailableTime(coupon: PercentageCoupon, now: Date): boolean {
  const current = now.toTimeString().slice(0, 8);
  return coupon.availableTime.start <= current && current <= coupon.availableTime.end;
}

function bogoTargetItem(coupon: BogoCoupon, items: readonly OrderItem[]): OrderItem | undefined {
  const threshold = coupon.buyQuantity + coupon.getQuantity;
  return items
    .filter((item) => coupon.applicableProductIds.includes(item.productId) && item.productQuantity >= threshold)
    .sort((a, b) => b.productPrice - a.productPrice)[0];
}

type CouponWithMinimum = Extract<Coupon, MinimumOrderAmountRule>;

function requiresMinimum(coupon: Coupon): coupon is CouponWithMinimum {
  return "minimumOrderAmount" in coupon;
}

export function assessCoupon(coupon: Coupon, ctx: OrderContext): boolean {
  if (isExpired(coupon, ctx.now)) return false;
  const orderAmount = calcOrderAmount(ctx.items);

  if (requiresMinimum(coupon) && orderAmount < coupon.minimumOrderAmount) return false;

  switch (coupon.discountType) {
    case "fixed":
      return true;
    case "bogo":
      return bogoTargetItem(coupon, ctx.items) !== undefined;
    case "freeShipping":
      return calcShippingFee(ctx) > 0;
    case "percentage":
      return isWithinAvailableTime(coupon, ctx.now);
    default: {
      const _exhaustive: never = coupon;
      return _exhaustive;
    }
  }
}

function bogoDiscount(coupon: BogoCoupon, items: readonly OrderItem[]): number {
  const target = bogoTargetItem(coupon, items);
  return target ? target.productPrice * coupon.getQuantity : 0;
}

function productDiscount(coupons: readonly Coupon[], items: readonly OrderItem[]): number {
  return coupons.reduce((sum, coupon) => {
    if (coupon.discountType === "fixed") return sum + coupon.discountAmount;
    if (coupon.discountType === "bogo") return sum + bogoDiscount(coupon, items);
    return sum;
  }, 0);
}

function percentageDiscount(coupons: readonly Coupon[], base: number): number {
  return coupons.reduce((sum, coupon) => {
    if (coupon.discountType !== "percentage") return sum;
    const raw = Math.floor((base * coupon.discountRate) / 100);
    return sum + Math.min(raw, coupon.maximumDiscountAmount);
  }, 0);
}

export function calcComboDiscount(coupons: readonly Coupon[], ctx: OrderContext): number {
  const orderAmount = calcOrderAmount(ctx.items);
  const fixedLike = productDiscount(coupons, ctx.items);
  const percentage = percentageDiscount(coupons, orderAmount - fixedLike);
  const shipping = coupons.some((coupon) => coupon.discountType === "freeShipping") ? calcShippingFee(ctx) : 0;
  return fixedLike + percentage + shipping;
}

function combinationsUpToTwo(coupons: readonly Coupon[]): Coupon[][] {
  const combos: Coupon[][] = coupons.map((coupon) => [coupon]);
  for (let i = 0; i < coupons.length; i += 1) {
    for (let j = i + 1; j < coupons.length; j += 1) {
      combos.push([coupons[i], coupons[j]]);
    }
  }
  return combos;
}

export function pickBestCombination(coupons: readonly Coupon[], ctx: OrderContext): PricedCombination {
  const applicable = coupons.filter((coupon) => assessCoupon(coupon, ctx));
  if (applicable.length === 0) return { couponIds: [], couponDiscountAmount: 0 };
  return combinationsUpToTwo(applicable)
    .map((combo) => ({
      couponIds: combo.map((coupon) => coupon.id),
      couponDiscountAmount: calcComboDiscount(combo, ctx),
    }))
    .reduce((best, current) => (current.couponDiscountAmount > best.couponDiscountAmount ? current : best));
}

export function calcAmounts(
  ctx: OrderContext,
  couponId: readonly Coupon["id"][],
  coupons: readonly Coupon[],
): OrderAmounts {
  const orderAmount = calcOrderAmount(ctx.items);
  const selected = coupons.filter((coupon) => couponId.includes(coupon.id));
  const couponDiscountAmount = calcComboDiscount(selected, ctx);
  const shippingFee = calcShippingFee(ctx);
  const totalPaymentAmount = Math.max(0, orderAmount - couponDiscountAmount + shippingFee);
  return { orderAmount, couponDiscountAmount, shippingFee, totalPaymentAmount };
}

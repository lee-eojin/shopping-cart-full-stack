import type { Coupon, BogoCoupon, PercentageCoupon, OrderItem, MinimumOrderAmountRule } from "./database.ts";

export interface OrderContext {
  items: readonly OrderItem[];
  isRemoteArea: boolean;
  now: Date;
}

export interface PricedCombination {
  couponIds: Coupon["id"][];
  couponDiscountAmount: number;
  bonusProductAmount: number;
  totalBenefitAmount: number;
}

export interface OrderAmounts {
  orderAmount: number;
  couponDiscountAmount: number;
  bonusProductAmount: number;
  totalBenefitAmount: number;
  shippingFee: number;
  totalPaymentAmount: number;
}

interface CouponBenefits {
  couponDiscountAmount: number;
  bonusProductAmount: number;
  totalBenefitAmount: number;
}

const FREE_SHIPPING_THRESHOLD = 100_000;
const BASE_SHIPPING_FEE = 3_000;
const REMOTE_AREA_SURCHARGE = 3_000;
const TIME_ZONE = "Asia/Seoul";

function seoulWallClock(now: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);

  const at = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${at("year")}-${at("month")}-${at("day")}`,
    time: `${at("hour")}:${at("minute")}:${at("second")}`,
  };
}

export function calcOrderAmount(items: readonly OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.productPrice * item.productQuantity, 0);
}

export function calcShippingFee(ctx: OrderContext): number {
  if (calcOrderAmount(ctx.items) === 0) return 0;
  if (calcOrderAmount(ctx.items) >= FREE_SHIPPING_THRESHOLD) return 0;
  return BASE_SHIPPING_FEE + (ctx.isRemoteArea ? REMOTE_AREA_SURCHARGE : 0);
}

function isExpired(coupon: Coupon, now: Date): boolean {
  return seoulWallClock(now).date > coupon.expirationDate;
}

function isWithinAvailableTime(coupon: PercentageCoupon, now: Date): boolean {
  const current = seoulWallClock(now).time;
  return coupon.availableTime.start <= current && current <= coupon.availableTime.end;
}

function bogoTargetItem(coupon: BogoCoupon, items: readonly OrderItem[]): OrderItem | undefined {
  return items
    .filter(
      (item) =>
        coupon.applicableProductIds.includes(item.productId) && item.productQuantity >= coupon.buyQuantity,
    )
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

function fixedDiscount(coupons: readonly Coupon[]): number {
  return coupons.reduce((sum, coupon) => {
    if (coupon.discountType === "fixed") return sum + coupon.discountAmount;
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

export function calcBonusQuantity(
  item: OrderItem,
  coupons: readonly Coupon[],
  items: readonly OrderItem[],
): number {
  return coupons.reduce((quantity, coupon) => {
    if (coupon.discountType !== "bogo") return quantity;
    return bogoTargetItem(coupon, items)?.productId === item.productId
      ? quantity + coupon.getQuantity
      : quantity;
  }, 0);
}

export function calcComboBenefits(coupons: readonly Coupon[], ctx: OrderContext): CouponBenefits {
  const orderAmount = calcOrderAmount(ctx.items);
  const fixed = fixedDiscount(coupons);
  const percentage = percentageDiscount(coupons, Math.max(0, orderAmount - fixed));
  const shipping = coupons.some((coupon) => coupon.discountType === "freeShipping") ? calcShippingFee(ctx) : 0;
  const couponDiscountAmount = fixed + percentage + shipping;
  const bonusProductAmount = coupons.reduce((sum, coupon) => {
    if (coupon.discountType !== "bogo") return sum;
    const target = bogoTargetItem(coupon, ctx.items);
    return sum + (target ? target.productPrice * coupon.getQuantity : 0);
  }, 0);

  return {
    couponDiscountAmount,
    bonusProductAmount,
    totalBenefitAmount: couponDiscountAmount + bonusProductAmount,
  };
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

export function isBetter(current: PricedCombination, best: PricedCombination): boolean {
  if (current.totalBenefitAmount !== best.totalBenefitAmount)
    return current.totalBenefitAmount > best.totalBenefitAmount;
  if (current.couponIds.length !== best.couponIds.length)
    return current.couponIds.length < best.couponIds.length;

  for (let i = 0; i < current.couponIds.length; i += 1) {
    if (current.couponIds[i] !== best.couponIds[i]) return current.couponIds[i] < best.couponIds[i];
  }

  return false;
}

export function pickBestCombination(coupons: readonly Coupon[], ctx: OrderContext): PricedCombination {
  const applicable = coupons.filter((coupon) => assessCoupon(coupon, ctx));
  if (applicable.length === 0)
    return { couponIds: [], couponDiscountAmount: 0, bonusProductAmount: 0, totalBenefitAmount: 0 };
  return combinationsUpToTwo(applicable)
    .map((combo) => {
      const benefits = calcComboBenefits(combo, ctx);
      return {
        couponIds: combo.map((coupon) => coupon.id).sort((x, y) => x - y),
        ...benefits,
      };
    })
    .reduce((best, current) => (isBetter(current, best) ? current : best));
}

export function calcAmounts(
  ctx: OrderContext,
  couponIds: readonly Coupon["id"][],
  coupons: readonly Coupon[],
): OrderAmounts {
  const orderAmount = calcOrderAmount(ctx.items);
  const selected = coupons.filter((coupon) => couponIds.includes(coupon.id));
  const benefits = calcComboBenefits(selected, ctx);
  const shippingFee = calcShippingFee(ctx);
  const totalPaymentAmount = Math.max(0, orderAmount - benefits.couponDiscountAmount + shippingFee);
  return { orderAmount, ...benefits, shippingFee, totalPaymentAmount };
}

import { http, HttpResponse } from "msw";

import type { UpdateQuantityRequest } from "../cart/types.ts";
import type { AssessedCoupon, Coupon, CouponsResponse } from "../coupon/type.ts";
import type { CreateOrderRequest, Order, OrderItemResponse } from "../order/type.ts";

import { products, cart as initialCart, coupons } from "./fixtures.ts";

const PRODUCTS_URL = `${import.meta.env.VITE_API_BASE_URL}/products`;
const CART_URL = `${import.meta.env.VITE_API_BASE_URL}/cart`;
const COUPONS_URL = `${import.meta.env.VITE_API_BASE_URL}/coupons`;
const ORDER_URL = `${import.meta.env.VITE_API_BASE_URL}/order`;

let cart = [...initialCart];

type MockOrderItem = Omit<OrderItemResponse, "bonusQuantity">;

interface MockOrder {
  items: MockOrderItem[];
  couponIds: number[];
  isRemoteArea: boolean;
}
let order: MockOrder | null = null;

const FREE_SHIPPING_THRESHOLD = 100_000;
const BASE_SHIPPING_FEE = 3_000;
const REMOTE_AREA_SURCHARGE = 3_000;

function orderAmountOf(items: readonly MockOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.productPrice * item.productQuantity, 0);
}

function shippingFeeOf(items: readonly MockOrderItem[], isRemoteArea: boolean): number {
  const amount = orderAmountOf(items);
  if (amount === 0) return 0;
  if (amount >= FREE_SHIPPING_THRESHOLD) return 0;
  return BASE_SHIPPING_FEE + (isRemoteArea ? REMOTE_AREA_SURCHARGE : 0);
}

function bogoTarget(coupon: Extract<Coupon, { discountType: "bogo" }>, items: readonly MockOrderItem[]) {
  return items
    .filter(
      (item) =>
        coupon.applicableProductIds.includes(item.productId) && item.productQuantity >= coupon.buyQuantity,
    )
    .sort((a, b) => b.productPrice - a.productPrice)[0];
}

// mock: 시간대 로직은 생략
function assess(coupon: Coupon, items: readonly MockOrderItem[], isRemoteArea: boolean): boolean {
  const amount = orderAmountOf(items);
  if ("minimumOrderAmount" in coupon && amount < coupon.minimumOrderAmount) return false;
  switch (coupon.discountType) {
    case "fixed":
      return true;
    case "freeShipping":
      return shippingFeeOf(items, isRemoteArea) > 0;
    case "bogo":
      return bogoTarget(coupon, items) !== undefined;
    case "percentage":
      return true;
  }
}

function comboBenefits(selected: readonly Coupon[], items: readonly MockOrderItem[], isRemoteArea: boolean) {
  const fixed = selected.reduce((sum, coupon) => {
    if (coupon.discountType === "fixed") return sum + coupon.discountAmount;
    return sum;
  }, 0);
  const base = Math.max(0, orderAmountOf(items) - fixed);
  const percentage = selected.reduce((sum, coupon) => {
    if (coupon.discountType !== "percentage") return sum;
    return sum + Math.min(Math.floor((base * coupon.discountRate) / 100), coupon.maximumDiscountAmount);
  }, 0);
  const shipping = selected.some((coupon) => coupon.discountType === "freeShipping") ? shippingFeeOf(items, isRemoteArea) : 0;
  const couponDiscountAmount = fixed + percentage + shipping;
  const bonusProductAmount = selected.reduce((sum, coupon) => {
    if (coupon.discountType !== "bogo") return sum;
    const target = bogoTarget(coupon, items);
    return sum + (target?.productPrice ?? 0) * coupon.getQuantity;
  }, 0);
  return {
    couponDiscountAmount,
    bonusProductAmount,
    totalBenefitAmount: couponDiscountAmount + bonusProductAmount,
  };
}

function bonusQuantityOf(item: MockOrderItem, selected: readonly Coupon[], items: readonly MockOrderItem[]): number {
  return selected.reduce((quantity, coupon) => {
    if (coupon.discountType !== "bogo") return quantity;
    return bogoTarget(coupon, items)?.productId === item.productId
      ? quantity + coupon.getQuantity
      : quantity;
  }, 0);
}

function toResponse(value: MockOrder): Order {
  const orderAmount = orderAmountOf(value.items);
  const selected = coupons.filter((coupon) => value.couponIds.includes(coupon.id));
  const benefits = comboBenefits(selected, value.items, value.isRemoteArea);
  const shippingFee = shippingFeeOf(value.items, value.isRemoteArea);
  const totalPaymentAmount = Math.max(0, orderAmount - benefits.couponDiscountAmount + shippingFee);
  const items = value.items.map((item) => ({
    ...item,
    bonusQuantity: bonusQuantityOf(item, selected, value.items),
  }));
  return { ...value, items, orderAmount, ...benefits, shippingFee, totalPaymentAmount };
}

export const handlers = [
  http.get(PRODUCTS_URL, () => HttpResponse.json(products)),

  http.get(CART_URL, () => HttpResponse.json(cart)),

  http.post(`${CART_URL}/:id`, async ({ params }) => {
    const id = Number(params.id);
    const pickedProduct = products.find((product) => product.id === id);
    if (!pickedProduct) return new HttpResponse(null, { status: 404 });
    cart = [...cart, { ...pickedProduct, quantity: 1 }];
    return HttpResponse.json({ message: "장바구니에 추가되었습니다." }, { status: 201 });
  }),

  http.patch(`${CART_URL}/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const { quantity } = (await request.json()) as UpdateQuantityRequest;
    cart = cart.map((item) => (item.id === id ? { ...item, quantity } : item));
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${CART_URL}/:id`, async ({ params }) => {
    const id = Number(params.id);
    cart = cart.filter((item) => item.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(COUPONS_URL, () => {
    const base: MockOrder = order ?? { items: [], couponIds: [], isRemoteArea: false };
    const assessed: AssessedCoupon[] = coupons.map((coupon) => {
      const applicable = assess(coupon, base.items, base.isRemoteArea);
      const benefits = applicable
        ? comboBenefits([coupon], base.items, base.isRemoteArea)
        : { couponDiscountAmount: 0, bonusProductAmount: 0, totalBenefitAmount: 0 };
      return {
        ...coupon,
        applicable,
        standaloneDiscountAmount: benefits.couponDiscountAmount,
        standaloneBonusProductAmount: benefits.bonusProductAmount,
        standaloneTotalBenefitAmount: benefits.totalBenefitAmount,
      };
    });
    const response: CouponsResponse = {
      coupons: assessed,
      primaryPrice: {
        couponIds: [],
        couponDiscountAmount: 0,
        bonusProductAmount: 0,
        totalBenefitAmount: 0,
      },
    };
    return HttpResponse.json(response);
  }),

  http.post(ORDER_URL, async ({ request }) => {
    const body = (await request.json()) as CreateOrderRequest;
    const items: MockOrderItem[] = body.map((requested) => {
      const product = products.find((candidate) => candidate.id === requested.productId)!;
      return {
        productId: requested.productId,
        productPrice: product.price,
        productQuantity: requested.productQuantity,
        productName: product.name,
        imageUrl: product.imageUrl,
      };
    });
    order = { items, couponIds: [], isRemoteArea: false }; // mock: 최적 픽은 생략
    return HttpResponse.json(toResponse(order), { status: 201 });
  }),

  http.get(ORDER_URL, () => {
    if (!order) return HttpResponse.json({ errorMessage: "서버에 일시적인 오류가 발생했습니다." }, { status: 500 });
    return HttpResponse.json(toResponse(order));
  }),

  http.get(`${ORDER_URL}/coupons/preview`, ({ request }) => {
    const base: MockOrder = order ?? { items: [], couponIds: [], isRemoteArea: false };
    const raw = new URL(request.url).searchParams.get("couponIds") ?? "";
    const ids = raw ? raw.split(",").map(Number) : [];
    const selected = coupons.filter((coupon) => ids.includes(coupon.id));
    if (selected.length !== ids.length)
      return HttpResponse.json({ errorMessage: "존재하지 않는 쿠폰입니다." }, { status: 404 });
    if (selected.some((coupon) => !assess(coupon, base.items, base.isRemoteArea)))
      return HttpResponse.json({ errorMessage: "적용할 수 없는 쿠폰이 포함되어 있습니다.", code: "COUPON_NOT_APPLICABLE" }, { status: 400 });
    const orderAmount = orderAmountOf(base.items);
    const benefits = comboBenefits(selected, base.items, base.isRemoteArea);
    const shippingFee = shippingFeeOf(base.items, base.isRemoteArea);
    const totalPaymentAmount = Math.max(0, orderAmount - benefits.couponDiscountAmount + shippingFee);
    return HttpResponse.json({ ...benefits, totalPaymentAmount });
  }),

  http.patch(`${ORDER_URL}/coupons`, async ({ request }) => {
    if (!order) return HttpResponse.json({ errorMessage: "서버에 일시적인 오류가 발생했습니다." }, { status: 500 });
    const body = (await request.json().catch(() => null)) as { couponIds?: unknown } | null;
    const ids = Array.isArray(body?.couponIds) ? (body!.couponIds as number[]) : null;
    if (!ids) return HttpResponse.json({ errorMessage: "couponIds는 배열이어야 합니다." }, { status: 400 });
    const selected = coupons.filter((coupon) => ids.includes(coupon.id));
    if (selected.length !== ids.length)
      return HttpResponse.json({ errorMessage: "존재하지 않는 쿠폰입니다." }, { status: 404 });
    if (selected.some((coupon) => !assess(coupon, order!.items, order!.isRemoteArea)))
      return HttpResponse.json({ errorMessage: "적용할 수 없는 쿠폰이 포함되어 있습니다.", code: "COUPON_NOT_APPLICABLE" }, { status: 400 });
    order = { ...order, couponIds: ids };
    return HttpResponse.json(toResponse(order));
  }),

  http.patch(`${ORDER_URL}/destination`, async ({ request }) => {
    if (!order) return HttpResponse.json({ errorMessage: "서버에 일시적인 오류가 발생했습니다." }, { status: 500 });
    const body = (await request.json().catch(() => null)) as { isRemoteArea?: unknown } | null;
    if (typeof body?.isRemoteArea !== "boolean")
      return HttpResponse.json({ errorMessage: "isRemoteArea는 boolean이어야 합니다." }, { status: 400 });
    order = { ...order, isRemoteArea: body.isRemoteArea };
    return HttpResponse.json(toResponse(order));
  }),
];

export function resetCart() {
  cart = [...initialCart];
}

export function resetOrder() {
  order = null;
}

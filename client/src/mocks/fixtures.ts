import type { Coupon } from "../coupon/type.ts";
import type { Product } from "../product/types.ts";

export const products: Product[] = [
  { id: 1, imageUrl: "https://example.com/product-image.jpg", name: "상품명", price: 10000, quantity: 1 },
  { id: 2, imageUrl: "https://example.com/product2-image.jpg", name: "상품명2", price: 20000, quantity: 2 },
  { id: 3, imageUrl: "https://example.com/product3-image.jpg", name: "상품명3", price: 30000, quantity: 3 },
];

export const cart: Product[] = [
  { id: 1, imageUrl: "https://example.com/product-image.jpg", name: "상품명", price: 10000, quantity: 1 },
  { id: 2, imageUrl: "https://example.com/product2-image.jpg", name: "상품명2", price: 20000, quantity: 2 },
];

export const coupons: Coupon[] = [
  { id: 1, code: "FIXED5000", description: "5,000원 할인 쿠폰", expirationDate: "2026-11-30", discountType: "fixed", discountAmount: 5000, minimumOrderAmount: 100000 },
  { id: 2, code: "BOGO", description: "2개 구매 시 1개 무료 쿠폰 (스니커즈, 양말 전용 대상)", expirationDate: "2026-06-30", discountType: "bogo", buyQuantity: 2, getQuantity: 1, applicableProductIds: [2, 4] },
  { id: 3, code: "FREESHIPPING", description: "배송비 무료 쿠폰", expirationDate: "2026-08-31", discountType: "freeShipping", minimumOrderAmount: 50000 },
  { id: 4, code: "MIRACLESALE", description: "30% 할인 쿠폰", expirationDate: "2026-07-31", discountType: "percentage", discountRate: 30, maximumDiscountAmount: 100000, availableTime: { start: "04:00:00", end: "07:00:00" } },
];

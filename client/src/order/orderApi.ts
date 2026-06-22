import { apiRequest } from "../shared/api/client";

import type { Order, CouponPreview, CreateOrderRequest, UpdateCouponsRequest, UpdateDestinationRequest } from "./type";

export function submitOrder(items: CreateOrderRequest): Promise<Order> {
  return apiRequest<Order>("/order", { method: "POST", body: JSON.stringify(items) });
}

export function getOrder(): Promise<Order> {
  return apiRequest<Order>("/order");
}

export function updateCoupons(couponIds: UpdateCouponsRequest): Promise<Order> {
  return apiRequest<Order>("/order/coupons", { method: "PATCH", body: JSON.stringify(couponIds) });
}

export function previewCoupons({ couponIds }: UpdateCouponsRequest): Promise<CouponPreview> {
  return apiRequest<CouponPreview>(`/order/coupons/preview?couponIds=${couponIds.join(",")}`);
}

export function updateDestination(request: UpdateDestinationRequest): Promise<Order> {
  return apiRequest<Order>("/order/destination", { method: "PATCH", body: JSON.stringify(request) });
}

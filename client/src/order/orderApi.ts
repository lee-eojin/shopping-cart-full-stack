import { apiRequest } from "../shared/api/client";
import type { Order, OrderRequestItem, CouponPreview } from "./type";

export function submitOrder(items: OrderRequestItem[]): Promise<Order> {
  return apiRequest<Order>("/order", { method: "POST", body: JSON.stringify(items) });
}

export function getOrder(): Promise<Order> {
  return apiRequest<Order>("/order");
}

export function updateCoupons(couponIds: number[]): Promise<Order> {
  return apiRequest<Order>("/order/coupons", { method: "PATCH", body: JSON.stringify(couponIds) });
}

export function previewCoupons(couponIds: number[]): Promise<CouponPreview> {
  return apiRequest<CouponPreview>(`/order/coupons/preview?couponIds=${couponIds.join(",")}`);
}

export function updateDestination(isRemoteArea: boolean): Promise<Order> {
  return apiRequest<Order>("/order/destination", { method: "PATCH", body: JSON.stringify({ isRemoteArea }) });
}

import type { CouponId } from "../coupon/type";
import type { Product } from "../product/types";

export interface OrderItem {
  productId: Product["id"];
  productPrice: number;
  productQuantity: number;
}

export interface OrderItemResponse extends OrderItem {
  productName: Product["name"];
  imageUrl: Product["imageUrl"];
  bonusQuantity: number;
}

export interface OrderAmounts {
  orderAmount: number;
  couponDiscountAmount: number;
  bonusProductAmount: number;
  totalBenefitAmount: number;
  shippingFee: number;
  totalPaymentAmount: number;
}


export interface Order extends OrderAmounts{
  items: OrderItemResponse[];
  couponIds: CouponId[];
  isRemoteArea: boolean;
}

export type CouponPreview = Pick<
  Order,
  "couponDiscountAmount" | "bonusProductAmount" | "totalBenefitAmount" | "totalPaymentAmount"
>;
export type OrderRequestItem = Pick<OrderItem, "productId" | "productQuantity">;
export type CreateOrderRequest = OrderRequestItem[];
export type UpdateCouponsRequest = Pick<Order, "couponIds">;
export type UpdateDestinationRequest = Pick<Order, "isRemoteArea">;

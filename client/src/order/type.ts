export interface OrderItem {
  productId: number;
  productPrice: number;
  productQuantity: number;
}

export interface Order {
  items: OrderItem[];
  couponIds: number[];
  isRemoteArea: boolean;
  orderAmount: number;
  couponDiscountAmount: number;
  shippingFee: number;
  totalPaymentAmount: number;
}

// preview는 Order에서 두 필드만 노출 → 파생으로 표현
export type CouponPreview = Pick<Order, "couponDiscountAmount" | "totalPaymentAmount">;

// POST /order 요청 항목
export type OrderRequestItem = Pick<OrderItem, "productId" | "productQuantity">;

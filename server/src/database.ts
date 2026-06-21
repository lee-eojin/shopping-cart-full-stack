export interface Product {
  id: number;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

export type ProductId = Product["id"]
export type CreateProductRequest = Omit<Product, "id">

export interface CouponBase {
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
  applicableProductIds: number[];
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

export interface OrderItem {
  productId: number;
  productPrice: number;
  productQuantity: number;
}

export interface Order {
  items: OrderItem[];
  couponIds: number[];
  isRemoteArea: boolean;
}

export type OrderRequestItem = Pick<OrderItem, "productId" | "productQuantity">;
export type CreateOrderRequest = OrderItem[]
export type UpdateCouponsRequest = Pick<Order, "couponIds">
export type UpdateDestinationRequest = Pick<Order, "isRemoteArea">;

export interface Database {
  Products: Product[] | undefined;
  Cart: Product[] | undefined;
  Coupons: Coupon[] | undefined;
  Order: Order | undefined;
}

export const DB: Database = {
  Products: [],
  Cart: [],
  Coupons: [
    {
      id: 1,
      code: "FIXED5000",
      description: "5,000원 할인 쿠폰",
      expirationDate: "2026-11-30",
      minimumOrderAmount: 100000,
      discountType: "fixed",
      discountAmount: 5000,
    },
    {
      id: 2,
      code: "BOGO",
      description: "2개 구매 시 1개 무료 쿠폰",
      expirationDate: "2026-06-30",
      discountType: "bogo",
      buyQuantity: 2,
      getQuantity: 1,
      applicableProductIds: [2],
    },
    {
      id: 3,
      code: "FREESHIPPING",
      description: "배송비 무료 쿠폰",
      expirationDate: "2026-08-31",
      minimumOrderAmount: 50000,
      discountType: "freeShipping",
    },
    {
      id: 4,
      code: "MIRACLESALE",
      description: "30% 할인 쿠폰",
      expirationDate: "2026-07-31",
      discountType: "percentage",
      discountRate: 30,
      maximumDiscountAmount: 100000,
      availableTime: { start: "04:00:00", end: "07:00:00" },
    },
  ],
  Order: undefined,
};

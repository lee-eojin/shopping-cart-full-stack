import express from "express";
import type { Coupon, CouponId, Database, Order, OrderItem, Product, UpdateCouponsRequest } from "../database";
import { validateOrderItems, validateCouponIds, validateIsRemoteArea } from "../validation";
import {
  assessCoupon,
  calcAmounts,
  calcBonusQuantity,
  pickBestCombination,
  type OrderAmounts,
  type OrderContext,
} from "../couponRules";
import { HttpError, ensureExists } from "../httpError";
import { withErrorHandling } from "./withErrorHandling";

type Clock = () => Date;

interface OrderItemResponse extends OrderItem {
  productName: Product["name"];
  imageUrl: Product["imageUrl"];
  bonusQuantity: number;
}

type OrderResponse = Omit<Order, "items"> & {
  items: OrderItemResponse[];
} & OrderAmounts;

function parseCouponIds(raw: unknown): CouponId[] {
  if (raw === undefined) return [];
  if (typeof raw !== "string") throw new HttpError(400, "couponIds 형식이 올바르지 않습니다.");
  if (raw.length === 0) return [];
  return raw.split(",").map(Number);
}

export function createOrderRouter(db: Database, clock: Clock = () => new Date()) {
  const orderRouter = express.Router();
  orderRouter.use(express.json());

  const context = (order: Order, now: Date): OrderContext => ({
    items: order.items,
    isRemoteArea: order.isRemoteArea,
    now,
  });
  const findCoupon = (coupons: readonly Coupon[], id: CouponId): Coupon | undefined =>
    coupons.find((coupon) => coupon.id === id);

  const toItemResponse = (
    products: readonly Product[],
    item: OrderItem,
    bonusQuantity: number,
  ): OrderItemResponse => {
    const product = products.find((candidate) => candidate.id === item.productId);
    ensureExists(product);
    return { ...item, productName: product.name, imageUrl: product.imageUrl, bonusQuantity };
  };
  const orderResponse = (
    order: Order,
    products: readonly Product[],
    coupons: readonly Coupon[],
    ctx: OrderContext,
  ): OrderResponse => {
    const selectedCoupons = coupons.filter((coupon) => order.couponIds.includes(coupon.id));
    return {
      ...order,
      items: order.items.map((item) =>
        toItemResponse(products, item, calcBonusQuantity(item, selectedCoupons, order.items)),
      ),
      ...calcAmounts(ctx, order.couponIds, coupons),
    };
  };

  function requireUsableCouponIds(
    raw: unknown,
    coupons: readonly Coupon[],
    ctx: OrderContext,
  ): UpdateCouponsRequest["couponIds"] {
    validateCouponIds(raw); // null/비배열/NaN/3장/중복

    const selected = raw.map((id) => {
      const coupon = findCoupon(coupons, id);
      if (!coupon) throw new HttpError(404, "존재하지 않는 쿠폰입니다.");
      return coupon;
    });
    if (selected.some((coupon) => !assessCoupon(coupon, ctx)))
      throw new HttpError(400, "적용할 수 없는 쿠폰이 포함되어 있습니다.", "COUPON_NOT_APPLICABLE");
    return raw;
  }

  function releaseInvalidCoupons(order: Order, coupons: readonly Coupon[], ctx: OrderContext): void {
    order.couponIds = order.couponIds.filter((id) => {
      const coupon = findCoupon(coupons, id);
      return coupon !== undefined && assessCoupon(coupon, ctx);
    });
  }

  orderRouter.post(
    "/",
    withErrorHandling((req, res) => {
      ensureExists(db.Products);
      ensureExists(db.Coupons);
      const products = db.Products;
      const coupons = db.Coupons;
      validateOrderItems(req.body); // 빈 주문과 잘못된 id/수량 차단(이후 req.body는 좁혀짐)

      const ids = req.body.map((item) => item.productId);
      if (new Set(ids).size !== ids.length) throw new HttpError(400, "중복된 상품이 있습니다.");
      const items: OrderItem[] = req.body.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) throw new HttpError(400, "존재하지 않는 상품이 포함되어 있습니다.");
        return { productId: item.productId, productPrice: product.price, productQuantity: item.productQuantity };
      });
      const ctx: OrderContext = { items, isRemoteArea: false, now: clock() };
      const best = pickBestCombination(coupons, ctx);
      const order: Order = { items, couponIds: best.couponIds, isRemoteArea: false };
      db.Order = order;
      res.status(201).json(orderResponse(order, products, coupons, ctx));
    }),
  );

  orderRouter.get(
    "/",
    withErrorHandling((req, res) => {
      ensureExists(db.Order);
      ensureExists(db.Products);
      ensureExists(db.Coupons);
      const order = db.Order;
      const products = db.Products;
      const coupons = db.Coupons;
      const ctx = context(order, clock());
      releaseInvalidCoupons(order, coupons, ctx);
      res.status(200).json(orderResponse(order, products, coupons, ctx));
    }),
  );

  orderRouter.get(
    "/coupons/preview",
    withErrorHandling((req, res) => {
      ensureExists(db.Order);
      ensureExists(db.Coupons);
      const order = db.Order;
      const coupons = db.Coupons;
      const ctx = context(order, clock());
      const couponIds = requireUsableCouponIds(parseCouponIds(req.query.couponIds), coupons, ctx);
      const { couponDiscountAmount, bonusProductAmount, totalBenefitAmount, totalPaymentAmount } = calcAmounts(
        ctx,
        couponIds,
        coupons,
      );
      res.status(200).json({
        couponDiscountAmount,
        bonusProductAmount,
        totalBenefitAmount,
        totalPaymentAmount,
      });
    }),
  );

  orderRouter.patch(
    "/coupons",
    withErrorHandling((req, res) => {
      ensureExists(db.Order);
      ensureExists(db.Products);
      ensureExists(db.Coupons);
      const order = db.Order;
      const products = db.Products;
      const coupons = db.Coupons;
      const ctx = context(order, clock());
      const rawCouponIds =
        req.body !== null && typeof req.body === "object" ? Reflect.get(req.body, "couponIds") : undefined;
      const couponIds = requireUsableCouponIds(rawCouponIds, coupons, ctx);
      order.couponIds = couponIds;
      res.status(200).json(orderResponse(order, products, coupons, ctx));
    }),
  );

  orderRouter.patch(
    "/destination",
    withErrorHandling((req, res) => {
      ensureExists(db.Order);
      ensureExists(db.Products);
      ensureExists(db.Coupons);
      const order = db.Order;
      const products = db.Products;
      const coupons = db.Coupons;
      validateIsRemoteArea(req.body); // isRemoteArea로 좁혀짐

      order.isRemoteArea = req.body.isRemoteArea;
      const ctx = context(order, clock());
      releaseInvalidCoupons(order, coupons, ctx);
      res.status(200).json(orderResponse(order, products, coupons, ctx));
    }),
  );

  return orderRouter;
}

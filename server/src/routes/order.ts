import express from "express";
import { Database, Coupon } from "../database";
import { Validator } from "../validation";
import { assessCoupon, calcAmounts, pickBestCombination, OrderContext } from "../couponRules";
import { HttpError, ensureExists } from "../httpError";
import { tryCatch } from "./tryCatch";

function parseCouponIds(raw: unknown): number[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  return raw.split(",").map(Number);
}

export function createOrderRouter(db: Database) {
  const orderRouter = express.Router();
  orderRouter.use(express.json());

  const context = (): OrderContext => ({
    items: db.Order!.items,
    isRemoteArea: db.Order!.isRemoteArea,
    now: new Date(),
  });

  const orderResponse = () => ({ ...db.Order, ...calcAmounts(context(), db.Order!.couponIds, db.Coupons!) });
  const findCoupon = (id: number): Coupon | undefined => db.Coupons!.find((coupon) => coupon.id === id);

  orderRouter.get(
    "/",
    tryCatch((req, res) => {
      ensureExists(db.Order);
      ensureExists(db.Coupons);
      
      res.status(200).json(orderResponse());
    }),
  );

  orderRouter.get(
    "/coupons/preview",
    tryCatch((req, res) => {
      ensureExists(db.Order);
      ensureExists(db.Coupons);
      
      const couponIds = parseCouponIds(req.query.couponIds);
      Validator.validateCouponIds({ couponIds });
      const { couponDiscountAmount, totalPaymentAmount } = calcAmounts(context(), couponIds, db.Coupons);
      
      res.status(200).json({ couponDiscountAmount, totalPaymentAmount });
    }),
  );

  orderRouter.post(
    "/",
    tryCatch((req, res) => {
      ensureExists(db.Products);
      ensureExists(db.Coupons);

      const items = (req.body as { productId: number; productQuantity: number }[]).map((item) => ({
        productId: item.productId,
        productPrice: db.Products!.find((product) => product.id === item.productId)?.price ?? 0,
        productQuantity: item.productQuantity,
      }));

      const best = pickBestCombination(db.Coupons, { items, isRemoteArea: false, now: new Date() });
      db.Order = { items, couponIds: best.couponIds, isRemoteArea: false };
      
      res.status(201).json(orderResponse());
    }),
  );

  orderRouter.patch(
    "/coupons",
    tryCatch((req, res) => {
      ensureExists(db.Order);
      ensureExists(db.Coupons);
      
      const { couponIds } = req.body as { couponIds: number[] };

      Validator.validateCouponIds({ couponIds });
      const ctx = context();
      if (couponIds.some((id) => !findCoupon(id))) throw new HttpError(404, "존재하지 않는 쿠폰입니다.");
      if (couponIds.some((id) => !assessCoupon(findCoupon(id)!, ctx))) throw new HttpError(400, "적용할 수 없는 쿠폰이 포함되어 있습니다.");
      db.Order.couponIds = couponIds;
      
      res.status(200).json(orderResponse());
    }),
  );

  orderRouter.patch(
    "/destination",
    tryCatch((req, res) => {
      ensureExists(db.Order);
      ensureExists(db.Coupons);
      
      const { isRemoteArea } = req.body as { isRemoteArea: boolean };
      Validator.validateIsRemoteArea({ isRemoteArea });
      db.Order.isRemoteArea = isRemoteArea;
      const ctx = context();
      db.Order.couponIds = db.Order.couponIds.filter((id) => assessCoupon(findCoupon(id)!, ctx));
      
      res.status(200).json(orderResponse());
    }),
  );

  return orderRouter;
}

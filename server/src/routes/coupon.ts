import express from "express";
import { Database } from "../database";
import { assessCoupon, pickBestCombination, OrderContext } from "../couponRules";
import { ensureExists } from "../httpError";
import { tryCatch } from "./tryCatch";

export function createCouponRouter(db: Database) {
  const couponRouter = express.Router();

  couponRouter.get(
    "/",
    tryCatch((req, res) => {
      ensureExists(db.Coupons);
      ensureExists(db.Order);
      const ctx: OrderContext = { items: db.Order.items, isRemoteArea: db.Order.isRemoteArea, now: new Date() };
      const coupons = db.Coupons.map((coupon) => ({ ...coupon, applicable: assessCoupon(coupon, ctx) }));
      res.status(200).json({ coupons, primaryPrice: pickBestCombination(db.Coupons, ctx) });
    }),
  );

  return couponRouter;
}
import express from "express";
import { Coupon, Database } from "../database";
import { assessCoupon, pickBestCombination, type OrderContext, calcComboDiscount, type PricedCombination } from "../couponRules";
import { ensureExists } from "../httpError";
import { withErrorHandling } from "./withErrorHandling";

type Clock = () => Date;

type AssessedCoupon = Coupon & {
  applicable: boolean;
  standaloneDiscountAmount: number;
}

interface CouponResponse {
  coupons: AssessedCoupon[];
  primaryPrice: PricedCombination;
}

export function createCouponRouter(db: Database, clock: Clock = () => new Date()) {
  const couponRouter = express.Router();

  couponRouter.get(
    "/",
    withErrorHandling((req, res) => {
      ensureExists(db.Coupons);
      ensureExists(db.Order);
      
      const ctx: OrderContext = { items: db.Order.items, isRemoteArea: db.Order.isRemoteArea, now: clock() };
      const coupons: AssessedCoupon[] = db.Coupons.map((coupon) => {
        const applicable = assessCoupon(coupon, ctx);
        return { ...coupon, applicable, standaloneDiscountAmount: applicable ? calcComboDiscount([coupon], ctx) : 0 };
      });
      
      res.status(200).json({ coupons, primaryPrice: pickBestCombination(db.Coupons, ctx)});
    }),
  );

  return couponRouter;
}
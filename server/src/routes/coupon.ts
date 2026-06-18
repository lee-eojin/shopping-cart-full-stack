import express, { Request, Response } from "express";
import { Database } from "../database";
import { assessCoupon, pickBestCombination, OrderContext } from "../couponRules";

export function createCouponRouter(db: Database) {
  const couponRouter = express.Router();

  couponRouter.get("/", (req: Request, res: Response) => {
    if (!db.Coupons || !db.Order) return res.status(500).json({ errorMessage: "서버에 일시적인 오류가 발생했습니다." });
    const ctx: OrderContext = { items: db.Order.items, isRemoteArea: db.Order.isRemoteArea, now: new Date() };
    const coupons = db.Coupons.map((coupon) => ({ ...coupon, applicable: assessCoupon(coupon, ctx) }));
    res.status(200).json({ coupons, primaryPrice: pickBestCombination(db.Coupons, ctx) });
  });
  return couponRouter;
}

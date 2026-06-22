import express from "express";
import request from "supertest";

import type { BogoCoupon, Database } from "../src/database";
import { createCouponRouter } from "../src/routes/coupon";
import { createOrderRouter } from "../src/routes/order";

const NOW = new Date("2026-06-15T05:00:00+09:00");
const bogo: BogoCoupon = {
  id: 2,
  code: "BOGO",
  description: "2개 구매 시 1개 무료 쿠폰 (스니커즈, 양말 전용 대상)",
  expirationDate: "2026-06-30",
  discountType: "bogo",
  buyQuantity: 2,
  getQuantity: 1,
  applicableProductIds: [2],
};

const db: Database = {
  Products: [
    {
      id: 2,
      imageUrl: "https://example.com/product.jpg",
      name: "대상 상품",
      price: 39_000,
      quantity: 2,
    },
  ],
  Cart: [],
  Coupons: [bogo],
  Order: undefined,
};

const app = express();
app.use("/order", createOrderRouter(db, () => NOW));
app.use("/coupons", createCouponRouter(db, () => NOW));

beforeEach(() => {
  db.Order = undefined;
});

describe("BOGO 주문 API", () => {
  test("결제 수량 2개 주문에 BOGO를 자동 적용하고 증정 수량을 응답한다", async () => {
    const response = await request(app)
      .post("/order")
      .send([{ productId: 2, productQuantity: 2 }]);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      couponIds: [2],
      orderAmount: 78_000,
      couponDiscountAmount: 0,
      bonusProductAmount: 39_000,
      totalBenefitAmount: 39_000,
      totalPaymentAmount: 81_000,
      items: [{ productId: 2, productQuantity: 2, bonusQuantity: 1 }],
    });
  });

  test("쿠폰 목록에서 결제 수량 2개의 BOGO를 활성화한다", async () => {
    await request(app).post("/order").send([{ productId: 2, productQuantity: 2 }]);

    const response = await request(app).get("/coupons");

    expect(response.status).toBe(200);
    expect(response.body.coupons[0]).toMatchObject({
      applicable: true,
      standaloneDiscountAmount: 0,
      standaloneBonusProductAmount: 39_000,
      standaloneTotalBenefitAmount: 39_000,
    });
  });
});

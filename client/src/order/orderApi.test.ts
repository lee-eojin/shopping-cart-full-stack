import { afterEach, describe, expect, test } from "@jest/globals";

import { resetOrder } from "../mocks/handlers.ts";

import { submitOrder, updateCoupons } from "./orderApi.ts";

afterEach(resetOrder);

describe("BOGO 주문 응답", () => {
  test("2개를 결제하고 쿠폰을 적용하면 1개를 증정하되 결제액은 줄이지 않는다", async () => {
    await submitOrder([{ productId: 2, productQuantity: 2 }]);

    const order = await updateCoupons({ couponIds: [2] });

    expect(order.items[0]).toMatchObject({ productQuantity: 2, bonusQuantity: 1 });
    expect(order).toMatchObject({
      orderAmount: 40_000,
      couponDiscountAmount: 0,
      bonusProductAmount: 20_000,
      totalBenefitAmount: 20_000,
      totalPaymentAmount: 43_000,
    });
  });
});

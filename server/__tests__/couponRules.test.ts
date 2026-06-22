import { assessCoupon, calcAmounts, calcBonusQuantity } from "../src/couponRules";
import { DB, type BogoCoupon, type OrderItem } from "../src/database";

const NOW = new Date("2026-06-15T05:00:00+09:00");
const bogo = DB.Coupons!.find((coupon): coupon is BogoCoupon => coupon.discountType === "bogo")!;

function context(productQuantity: number) {
  const item: OrderItem = {
    productId: 2,
    productPrice: 39_000,
    productQuantity,
  };
  return { item, ctx: { items: [item], isRemoteArea: false, now: NOW } };
}

describe("BOGO 증정", () => {
  test("대상 상품을 2개 결제하면 쿠폰을 적용할 수 있다", () => {
    expect(assessCoupon(bogo, context(1).ctx)).toBe(false);
    expect(assessCoupon(bogo, context(2).ctx)).toBe(true);
  });

  test("3,000원 양말도 대상 상품으로 2개부터 적용할 수 있다", () => {
    const socks: OrderItem = {
      productId: 4,
      productPrice: 3_000,
      productQuantity: 2,
    };
    const ctx = { items: [socks], isRemoteArea: false, now: NOW };

    expect(assessCoupon(bogo, ctx)).toBe(true);
    expect(calcBonusQuantity(socks, [bogo], ctx.items)).toBe(1);
  });

  test("결제 수량 2개는 유지하고 증정 수량 1개를 파생한다", () => {
    const { item, ctx } = context(2);

    expect(calcBonusQuantity(item, [bogo], ctx.items)).toBe(1);
  });

  test("증정 상품 가치는 혜택에 포함하지만 결제 금액에서 다시 차감하지 않는다", () => {
    const { ctx } = context(2);

    expect(calcAmounts(ctx, [bogo.id], [bogo])).toEqual({
      orderAmount: 78_000,
      couponDiscountAmount: 0,
      bonusProductAmount: 39_000,
      totalBenefitAmount: 39_000,
      shippingFee: 3_000,
      totalPaymentAmount: 81_000,
    });
  });
});

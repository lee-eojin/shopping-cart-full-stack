import {
  assessCoupon,
  calcAmounts,
  calcBonusQuantity,
  calcShippingFee,
  pickBestCombination,
} from "../src/couponRules";
import { DB, type BogoCoupon, type Coupon, type OrderItem } from "../src/database";

const NOW = new Date("2026-06-15T05:00:00+09:00");
const bogo = DB.Coupons!.find((coupon): coupon is BogoCoupon => coupon.discountType === "bogo")!;
const findCoupon = (id: number): Coupon => DB.Coupons!.find((coupon) => coupon.id === id)!;

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

  test("존재하지 않는 쿠폰 ID는 조용히 무시하지 않는다", () => {
    const { ctx } = context(2);

    expect(() => calcAmounts(ctx, [999], [bogo])).toThrow("존재하지 않는 쿠폰 ID가 포함되어 있습니다.");
  });
});

describe("쿠폰 금액 계산", () => {
  test("정액 쿠폰을 먼저 차감한 뒤 남은 금액에 정률 쿠폰을 적용한다", () => {
    const ctx = {
      items: [{ productId: 1, productPrice: 120_000, productQuantity: 1 }],
      isRemoteArea: false,
      now: NOW,
    };

    expect(calcAmounts(ctx, [1, 4], [findCoupon(1), findCoupon(4)])).toMatchObject({
      orderAmount: 120_000,
      couponDiscountAmount: 39_500,
      shippingFee: 0,
      totalPaymentAmount: 80_500,
    });
  });

  test("최적 조합은 결제 할인과 증정 상품 가치를 합친 총 혜택으로 고른다", () => {
    const { ctx } = context(2);

    expect(pickBestCombination(DB.Coupons!, ctx)).toEqual({
      couponIds: [2, 4],
      couponDiscountAmount: 23_400,
      bonusProductAmount: 39_000,
      totalBenefitAmount: 62_400,
    });
  });

  test("주문 금액 10만 원 이상이면 도서산간 추가 배송비도 면제한다", () => {
    const below = {
      items: [{ productId: 1, productPrice: 99_999, productQuantity: 1 }],
      isRemoteArea: true,
      now: NOW,
    };
    const threshold = {
      items: [{ productId: 1, productPrice: 100_000, productQuantity: 1 }],
      isRemoteArea: true,
      now: NOW,
    };

    expect(calcShippingFee(below)).toBe(6_000);
    expect(calcShippingFee(threshold)).toBe(0);
  });
});

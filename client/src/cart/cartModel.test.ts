import { describe, test, expect } from "@jest/globals";

import {
  applyCartAction,
  calcOrderAmount,
  calcShippingFee,
  calcTotal,
  canOrder,
  clampQuantity,
  SHIPPING_FEE,
} from "./cartModel.ts";
import type { CartItem, SelectableCartItem } from "./types.ts";

function item(partial: Partial<SelectableCartItem>): SelectableCartItem {
  return {
    id: 1,
    imageUrl: "",
    name: "상품",
    price: 0,
    quantity: 1,
    selected: true,
    ...partial,
  };
}

describe("calcOrderAmount", () => {
  test("선택된 상품만 price * quantity로 합산한다", () => {
    const items = [
      item({ price: 10000, quantity: 2, selected: true }),
      item({ price: 5000, quantity: 1, selected: false }),
    ];
    expect(calcOrderAmount(items)).toBe(20000);
  });

  test("선택된 상품이 없으면 0이다", () => {
    expect(calcOrderAmount([item({ selected: false })])).toBe(0);
  });
});

describe("calcShippingFee", () => {
  test("주문 금액이 0이면 배송비도 0이다", () => {
    expect(calcShippingFee(0)).toBe(0);
  });

  test("임계값 미만이면 3,000원이다", () => {
    expect(calcShippingFee(99_999)).toBe(SHIPPING_FEE);
  });

  test("임계값 이상이면 0이다", () => {
    expect(calcShippingFee(100_000)).toBe(0);
  });
});

describe("calcTotal", () => {
  test("주문 금액 + 배송비다", () => {
    expect(calcTotal(99_999, 3_000)).toBe(102_999);
  });
});

describe("canOrder", () => {
  test("주문 금액이 0이면 주문할 수 없다", () => {
    expect(canOrder(0)).toBe(false);
  });

  test("주문 금액이 있으면 주문할 수 있다", () => {
    expect(canOrder(1)).toBe(true);
  });
});

describe("clampQuantity", () => {
  test("1 미만은 1로 올린다", () => {
    expect(clampQuantity(0)).toBe(1);
  });

  test("99 초과는 99로 내린다", () => {
    expect(clampQuantity(100)).toBe(99);
  });

  test("범위 안 값은 그대로 둔다", () => {
    expect(clampQuantity(50)).toBe(50);
  });
});

describe("applyCartAction", () => {
  const items: CartItem[] = [
    { id: 1, imageUrl: "", name: "A", price: 1000, quantity: 1 },
    { id: 2, imageUrl: "", name: "B", price: 2000, quantity: 2 },
  ];

  test("quantity 액션은 해당 상품의 수량만 바꾼다", () => {
    const next = applyCartAction(items, { type: "quantity", id: 1, quantity: 5 });
    expect(next.find((item) => item.id === 1)?.quantity).toBe(5);
    expect(next.find((item) => item.id === 2)?.quantity).toBe(2);
  });

  test("remove 액션은 해당 상품을 제거한다", () => {
    const next = applyCartAction(items, { type: "remove", id: 1 });
    expect(next).toHaveLength(1);
    expect(next.find((item) => item.id === 1)).toBeUndefined();
  });

  test("원본 배열을 변경하지 않는다", () => {
    applyCartAction(items, { type: "remove", id: 1 });
    expect(items).toHaveLength(2);
  });
});

import { describe, test, expect } from "@jest/globals";
import { formatPrice } from "./format.ts";

describe("formatPrice", () => {
  test("천 단위 comma와 원 단위를 붙인다", () => {
    expect(formatPrice(1000)).toBe("1,000원");
  });

  test("0원도 처리한다", () => {
    expect(formatPrice(0)).toBe("0원");
  });
});

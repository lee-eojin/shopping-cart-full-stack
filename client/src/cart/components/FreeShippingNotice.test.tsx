import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { FreeShippingNotice } from "./FreeShippingNotice.tsx";

describe("FreeShippingNotice", () => {
  test("남은 금액이 있으면 추가 안내를 보여준다", () => {
    render(<FreeShippingNotice remaining={30000} />);
    expect(screen.getByText("30,000원 더 담으면 무료배송 됩니다")).toBeInTheDocument();
  });

  test("이미 도달했으면 무료배송 안내를 보여준다", () => {
    render(<FreeShippingNotice remaining={0} />);
    expect(screen.getByText("무료배송 대상입니다")).toBeInTheDocument();
  });
});

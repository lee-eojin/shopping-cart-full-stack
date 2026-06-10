import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { OrderSummary } from "./OrderSummary.tsx";

describe("OrderSummary", () => {
  test("주문 금액·배송비·총 결제 금액을 보여준다", () => {
    render(<OrderSummary orderAmount={50000} shippingFee={3000} total={53000} />);

    expect(screen.getByText("주문 금액")).toBeInTheDocument();
    expect(screen.getByText("50,000원")).toBeInTheDocument();
    expect(screen.getByText("배송비")).toBeInTheDocument();
    expect(screen.getByText("3,000원")).toBeInTheDocument();
    expect(screen.getByText("총 결제 금액")).toBeInTheDocument();
    expect(screen.getByText("53,000원")).toBeInTheDocument();
  });
});

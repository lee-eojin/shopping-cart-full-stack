import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderButton } from "./OrderButton.tsx";

describe("OrderButton", () => {
  test("결제 금액과 함께 버튼을 보여준다", () => {
    render(<OrderButton amount={53000} onCheckout={() => {}} />);
    expect(screen.getByRole("button", { name: "53,000원 결제하기" })).toBeInTheDocument();
  });

  test("클릭하면 onCheckout이 호출된다", async () => {
    const onCheckout = jest.fn();
    render(<OrderButton amount={53000} onCheckout={onCheckout} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  test("disabled면 클릭해도 onCheckout이 호출되지 않는다", async () => {
    const onCheckout = jest.fn();
    render(<OrderButton amount={0} disabled onCheckout={onCheckout} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onCheckout).not.toHaveBeenCalled();
  });
});

import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderButton } from "./OrderButton.tsx";

describe("OrderButton", () => {
  test("주문 확인 버튼을 보여준다", () => {
    render(<OrderButton onCheckout={() => {}} />);
    expect(screen.getByRole("button", { name: "주문 확인" })).toBeInTheDocument();
  });

  test("클릭하면 onCheckout이 호출된다", async () => {
    const onCheckout = jest.fn();
    render(<OrderButton onCheckout={onCheckout} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  test("disabled면 클릭해도 onCheckout이 호출되지 않는다", async () => {
    const onCheckout = jest.fn();
    render(<OrderButton disabled onCheckout={onCheckout} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onCheckout).not.toHaveBeenCalled();
  });
});

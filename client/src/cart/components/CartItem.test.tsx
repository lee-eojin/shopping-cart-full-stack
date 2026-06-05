import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartItem } from "./CartItem.tsx";
import type { SelectableCartItem } from "../types.ts";

const item: SelectableCartItem = {
  id: 1,
  imageUrl: "https://example.com/a.jpg",
  name: "상품명",
  price: 10000,
  quantity: 2,
  selected: true,
};

function renderItem(overrides: Partial<{
  onSelect: (id: number, selected: boolean) => void;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}> = {}) {
  const props = {
    onSelect: jest.fn(),
    onQuantityChange: jest.fn(),
    onRemove: jest.fn(),
    ...overrides,
  };
  render(
    <ul>
      <CartItem item={item} {...props} />
    </ul>,
  );
  return props;
}

describe("CartItem", () => {
  test("상품 이름·가격·수량을 보여준다", () => {
    renderItem();
    expect(screen.getByText("상품명")).toBeInTheDocument();
    expect(screen.getByText("10,000원")).toBeInTheDocument();
    expect(screen.getByLabelText("수량")).toHaveTextContent("2");
  });

  test("선택 상태가 체크박스에 반영된다", () => {
    renderItem();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  test("선택을 해제하면 onSelect(id, false)가 호출된다", async () => {
    const onSelect = jest.fn();
    renderItem({ onSelect });

    await userEvent.click(screen.getByRole("checkbox"));
    expect(onSelect).toHaveBeenCalledWith(1, false);
  });

  test("삭제 버튼을 누르면 onRemove(id)가 호출된다", async () => {
    const onRemove = jest.fn();
    renderItem({ onRemove });

    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  test("+ 버튼은 raw 수량+1로 onQuantityChange를 호출한다", async () => {
    const onQuantityChange = jest.fn();
    renderItem({ onQuantityChange });

    await userEvent.click(screen.getByRole("button", { name: "수량 증가" }));
    expect(onQuantityChange).toHaveBeenCalledWith(1, 3);
  });

  test("- 버튼은 raw 수량-1로 onQuantityChange를 호출한다", async () => {
    const onQuantityChange = jest.fn();
    renderItem({ onQuantityChange });

    await userEvent.click(screen.getByRole("button", { name: "수량 감소" }));
    expect(onQuantityChange).toHaveBeenCalledWith(1, 1);
  });
});

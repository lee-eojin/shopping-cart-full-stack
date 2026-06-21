import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SelectableCartItem } from "../types.ts";

import { CartList } from "./CartList.tsx";

const items: SelectableCartItem[] = [
  { id: 1, imageUrl: "a.jpg", name: "상품A", price: 10000, quantity: 1, selected: true },
  { id: 2, imageUrl: "b.jpg", name: "상품B", price: 20000, quantity: 2, selected: false },
];

function renderList(overrides: Partial<{
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
  render(<CartList items={items} {...props} />);
  return props;
}

describe("CartList", () => {
  test("모든 아이템을 렌더한다", () => {
    renderList();
    expect(screen.getByText("상품A")).toBeInTheDocument();
    expect(screen.getByText("상품B")).toBeInTheDocument();
  });

  test("특정 아이템의 삭제 의도를 해당 id로 그대로 전달한다", async () => {
    const onRemove = jest.fn();
    renderList({ onRemove });

    const deleteButtons = screen.getAllByRole("button", { name: "삭제" });
    await userEvent.click(deleteButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(2);
  });
});

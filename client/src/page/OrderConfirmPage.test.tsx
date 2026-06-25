import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { resetCart, resetOrder } from "../mocks/handlers.ts";
import { submitOrder, updateCoupons } from "../order/orderApi.ts";
import { QueryCache } from "../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../shared/api/query/QueryCacheProvider.tsx";
import { OverlayProvider } from "../shared/overlay/OverlayProvider.tsx";

import { OrderConfirmPage } from "./OrderConfirmPage.tsx";

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(() => {
  resetCart();
  resetOrder();
});

function renderConfirm() {
  const cache = new QueryCache();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryCacheProvider cache={cache}>
      <OverlayProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </OverlayProvider>
    </QueryCacheProvider>
  );

  return render(<OrderConfirmPage />, { wrapper });
}

async function seedOrder() {
  await submitOrder([
    { productId: 1, productQuantity: 1 },
    { productId: 2, productQuantity: 2 },
  ]);
}

describe("OrderConfirmPage", () => {
  test("주문서의 금액과 결제하기 버튼을 보여준다", async () => {
    await seedOrder();
    renderConfirm();

    await waitFor(() => expect(screen.getByText("53,000원")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "주문 확인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "결제하기" })).toBeInTheDocument();
  });

  test("뒤로 가기, 쿠폰 선택 버튼이 있다", async () => {
    await seedOrder();
    renderConfirm();

    expect(screen.getByRole("button", { name: "뒤로 가기" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "쿠폰 선택" })).toBeInTheDocument());
  });

  test("주문서 조회 전에는 스피너를 보여준다", async () => {
    await seedOrder();
    renderConfirm();

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  test("BOGO 적용 시 결제 수량과 증정 수량을 구분해 보여준다", async () => {
    await seedOrder();
    await updateCoupons({ couponIds: [2] });
    renderConfirm();

    await waitFor(() => expect(screen.getByText("증정 수량 1")).toBeInTheDocument());
    expect(screen.getByText("결제 수량 2")).toBeInTheDocument();
    expect(screen.getByText("총 2종류의 상품3개를 주문합니다.")).toBeInTheDocument();
    expect(screen.getByText("(BOGO쿠폰 적용 포함 수령 총4개)")).toBeInTheDocument();
  });

  test("쿠폰 선택 모달에서 preview 금액을 확인하고 적용하면 주문서 금액이 갱신된다", async () => {
    const user = userEvent.setup();
    await seedOrder();
    renderConfirm();

    await waitFor(() => expect(screen.getByText("53,000원")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "쿠폰 선택" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "쿠폰 선택" }));
    await screen.findByRole("dialog", { name: "쿠폰을 선택해 주세요" });

    await user.click(screen.getByRole("checkbox", { name: "배송비 무료 쿠폰" }));
    const applyButton = await screen.findByRole("button", { name: "총 3,000원 혜택 쿠폰 사용하기" });
    await user.click(applyButton);

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "쿠폰을 선택해 주세요" })).not.toBeInTheDocument());
    expect(screen.getByText("쿠폰 할인")).toBeInTheDocument();
    expect(screen.getByText("- 3,000원")).toBeInTheDocument();
    expect(screen.queryByText("53,000원")).not.toBeInTheDocument();
  });

  test("주문서가 없으면 에러와 재시도 버튼을 보여준다", async () => {
    renderConfirm();

    await waitFor(() => expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "결제하기" })).not.toBeInTheDocument();
  });
});

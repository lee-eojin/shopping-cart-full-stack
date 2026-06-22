import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { resetCart, resetOrder } from "../mocks/handlers.ts";
import { submitOrder } from "../order/orderApi.ts";
import { QueryCache } from "../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../shared/api/query/QueryCacheProvider.tsx";
import { OverlayProvider } from "../shared/overlay/OverlayProvider.tsx";

import { OrderConfirmPage } from "./OrderConfirmPage.tsx";

beforeEach(() => localStorage.clear());
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

// 주문서를 먼저 만든다(POST /order). 10000*1 + 20000*2 = 50000, 배송비 3000 => 총 53000.
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

  test("뒤로 가기·쿠폰 선택 버튼이 있다", async () => {
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

  test("주문서가 없으면 에러와 재시도 버튼을 보여준다", async () => {
    renderConfirm();

    await waitFor(() => expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "결제하기" })).not.toBeInTheDocument();
  });
});

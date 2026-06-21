import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { resetCart } from "../mocks/handlers.ts";
import { server } from "../mocks/server.ts";
import { QueryCache } from "../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../shared/api/query/QueryCacheProvider.tsx";

import { OrderConfirmPage } from "./OrderConfirmPage.tsx";

const CART_URL = "http://localhost:8080/cart";

beforeEach(() => localStorage.clear());
afterEach(resetCart);

function renderConfirm() {
  const cache = new QueryCache();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryCacheProvider cache={cache}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryCacheProvider>
  );
  return render(<OrderConfirmPage />, { wrapper });
}

describe("OrderConfirmPage", () => {
  test("선택된 상품 기준 총 결제 금액을 재계산해 보여준다", async () => {
    // cart 전체 선택: 10000*1 + 20000*2 = 50000, 배송비 3000, 총 53000
    renderConfirm();
    await waitFor(() => expect(screen.getByText("53,000원")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "주문 확인" })).toBeInTheDocument();
  });

  test("뒤로 가기와 결제하기 버튼이 있다", async () => {
    renderConfirm();
    expect(screen.getByRole("button", { name: "뒤로 가기" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "결제하기" })).toBeInTheDocument(),
    );
  });

  test("장바구니 조회가 끝나기 전에는 금액 대신 스피너를 보여준다", async () => {
    renderConfirm();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("총 결제 금액")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  test("조회에 실패하면 에러와 재시도 버튼을 보여준다", async () => {
    server.use(
      http.get(CART_URL, () => HttpResponse.json({ errorMessage: "서버 오류" }, { status: 500 })),
    );
    renderConfirm();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument(),
    );
    expect(screen.queryByText("총 결제 금액")).not.toBeInTheDocument();
  });

  test("장바구니가 비어 있으면 안내와 함께 결제하기 버튼을 보여주지 않는다", async () => {
    server.use(http.get(CART_URL, () => HttpResponse.json([])));
    renderConfirm();

    await waitFor(() => expect(screen.getByText("주문할 상품이 없습니다")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "장바구니로 가기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "결제하기" })).not.toBeInTheDocument();
  });

  test("선택된 상품이 없으면 결제하기 버튼이 비활성화된다", async () => {
    localStorage.setItem("cart-selection", JSON.stringify({ 1: false, 2: false }));
    renderConfirm();

    await waitFor(() => expect(screen.getByText("0원")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "결제하기" })).toBeDisabled();
  });
});

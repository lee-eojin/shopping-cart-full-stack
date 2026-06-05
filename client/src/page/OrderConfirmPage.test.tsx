import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryCache } from "../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../shared/api/query/QueryCacheProvider.tsx";
import { resetCart } from "../mocks/handlers.ts";
import { OrderConfirmPage } from "./OrderConfirmPage.tsx";

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

  test("뒤로 가기와 결제하기 버튼이 있다", () => {
    renderConfirm();
    expect(screen.getByRole("button", { name: "뒤로 가기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "결제하기" })).toBeInTheDocument();
  });
});

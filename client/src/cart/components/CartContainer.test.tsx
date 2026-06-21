import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { createElement, type ReactNode } from "react";

import { resetCart } from "../../mocks/handlers.ts";
import { server } from "../../mocks/server.ts";
import { QueryCache } from "../../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../../shared/api/query/QueryCacheProvider.tsx";

import { CartContainer } from "./CartContainer.tsx";

const CART_URL = "http://localhost:8080/cart";

beforeEach(() => localStorage.clear());
afterEach(resetCart);

function renderContainer(onCheckout: () => void = jest.fn()) {
  const cache = new QueryCache();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryCacheProvider, { cache, children });
  return render(<CartContainer onCheckout={onCheckout} />, { wrapper });
}

describe("CartContainer", () => {
  test("로딩 중에는 스피너를 보여준다", async () => {
    renderContainer();
    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  test("진입 시 전체 선택 상태로 총 결제 금액을 보여준다", async () => {
    renderContainer();

    // cart: 10000*1 + 20000*2 = 50000, 배송비 3000, 총 53000
    await waitFor(() => expect(screen.getByText("53,000원")).toBeInTheDocument());

    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((checkbox) => expect(checkbox).toBeChecked());
  });

  test("상품 선택을 해제하면 총 결제 금액이 줄어든다", async () => {
    renderContainer();
    await waitFor(() => expect(screen.getByText("53,000원")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("checkbox", { name: "상품명2 선택" }));

    await waitFor(() => expect(screen.getByText("13,000원")).toBeInTheDocument());
  });

  test("삭제하면 목록에서 사라진다", async () => {
    renderContainer();
    await waitFor(() => expect(screen.getByText("상품명")).toBeInTheDocument());

    const deleteButtons = screen.getAllByRole("button", { name: "삭제" });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => expect(screen.queryByText("상품명")).not.toBeInTheDocument());
    expect(screen.getByText("상품명2")).toBeInTheDocument();
  });

  test("삭제는 서버 응답을 기다리지 않고 즉시 반영된다 (낙관적)", async () => {
    server.use(
      http.delete(`${CART_URL}/1`, async () => {
        await delay(100);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderContainer();
    await waitFor(() => expect(screen.getByText("상품명")).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    // delete 응답이 100ms 지연되지만 낙관적으로 이미 사라진다
    expect(screen.queryByText("상품명")).not.toBeInTheDocument();
    expect(screen.getByText("상품명2")).toBeInTheDocument();
  });

  test("주문 확인 버튼을 누르면 onCheckout이 호출된다", async () => {
    const onCheckout = jest.fn();
    renderContainer(onCheckout);
    await waitFor(() => expect(screen.getByText("53,000원")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "주문 확인" }));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  test("조회에 실패하면 에러와 재시도 버튼을 보여준다", async () => {
    server.use(
      http.get(CART_URL, () => HttpResponse.json({ errorMessage: "서버 오류" }, { status: 500 })),
    );
    renderContainer();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument(),
    );
  });
});

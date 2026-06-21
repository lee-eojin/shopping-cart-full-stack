import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { resetCart } from "../mocks/handlers.ts";
import { QueryCache } from "../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../shared/api/query/QueryCacheProvider.tsx";

import { CartPage } from "./CartPage.tsx";
import { OrderConfirmPage } from "./OrderConfirmPage.tsx";

beforeEach(() => localStorage.clear());
afterEach(resetCart);

function renderApp() {
  const cache = new QueryCache();
  return render(
    <QueryCacheProvider cache={cache}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<CartPage />} />
          <Route path="/order" element={<OrderConfirmPage />} />
        </Routes>
      </MemoryRouter>
    </QueryCacheProvider>,
  );
}

describe("주문 확인 라우팅", () => {
  test("주문 확인 버튼을 누르면 주문 확인 페이지로 이동한다", async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText("53,000원")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "주문 확인" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "주문 확인" })).toBeInTheDocument(),
    );
  });
});

import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryCache } from "../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../shared/api/query/QueryCacheProvider.tsx";
import { CartPage } from "./CartPage.tsx";

function renderPage() {
  const cache = new QueryCache();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryCacheProvider cache={cache}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryCacheProvider>
  );
  return render(<CartPage />, { wrapper });
}

describe("CartPage", () => {
  test("SHOP 헤더와 장바구니 영역을 마운트한다", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "SHOP" })).toBeInTheDocument();
  });
});

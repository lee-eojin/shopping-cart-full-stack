import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryCache } from "./shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "./shared/api/query/QueryCacheProvider.tsx";
import App from "./App.tsx";

describe("App", () => {
  test("장바구니 화면(SHOP)을 마운트한다", () => {
    const cache = new QueryCache();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryCacheProvider, { cache, children });

    render(<App />, { wrapper });
    expect(screen.getByRole("heading", { name: "SHOP" })).toBeInTheDocument();
  });
});

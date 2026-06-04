import { describe, test, expect } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryCache } from "../../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../../shared/api/query/QueryCacheProvider.tsx";
import { useCart } from "./useCart.ts";

function renderUseCart() {
  const cache = new QueryCache();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryCacheProvider, { cache, children });

  return renderHook(() => useCart(), { wrapper });
}

describe("useCart", () => {
  test("처음에는 로딩 상태였다가 장바구니 목록을 채운다", async () => {
    const { result } = renderUseCart();

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.error).toBeUndefined();
  });
});

import { describe, test, expect } from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { server } from "../../../mocks/server.ts";
import { apiRequest } from "../client.ts";
import { QueryCache } from "./queryCache.ts";
import { QueryCacheProvider } from "./QueryCacheProvider.tsx";
import { useQuery } from "./useQuery.ts";
import type { Product } from "../../../product/types.ts";

const CART_URL = "http://localhost:8080/cart";

function renderUseCart() {
  const cache = new QueryCache();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryCacheProvider, { cache, children });

  return renderHook(() => useQuery<Product[]>({ queryKey: ["cart"], queryFn: () => apiRequest("/cart") }), { wrapper });
}

describe("useQuery", () => {
  test("처음에는 로딩 상태였다가 성공하면 data를 채운다", async () => {
    const { result } = renderUseCart();

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.error).toBeUndefined();
  });

  test("요청이 실패하면 error를 채운다", async () => {
    server.use(http.get(CART_URL, () => HttpResponse.json({ errorMessage: "서버 오류" }, { status: 500 })));

    const { result } = renderUseCart();

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error?.message).toBe("서버 오류");
    expect(result.current.data).toBeUndefined();
  });

  test("refetch는 목록을 다시 받아온다", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    server.use(http.get(CART_URL, () => HttpResponse.json([])));
    await act(async () => result.current.refetch());

    await waitFor(() => expect(result.current.data).toHaveLength(0));
  });
});

import { describe, test, expect, afterEach } from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryCache } from "../../shared/api/query/queryCache.ts";
import { QueryCacheProvider } from "../../shared/api/query/QueryCacheProvider.tsx";
import { resetCart } from "../../mocks/handlers.ts";
import { useCart } from "./useCart.ts";
import { useCartMutations } from "./useCartMutations.ts";

afterEach(resetCart);

function renderCartWithMutations() {
  const cache = new QueryCache();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryCacheProvider, { cache, children });

  return renderHook(() => ({ cart: useCart(), mutations: useCartMutations() }), { wrapper });
}

describe("useCartMutations", () => {
  test("removeFromCart 후 invalidate로 목록이 갱신된다", async () => {
    const { result } = renderCartWithMutations();
    await waitFor(() => expect(result.current.cart.data).toHaveLength(2));

    await act(async () => result.current.mutations.removeFromCart.mutate(1));

    await waitFor(() => expect(result.current.cart.data).toHaveLength(1));
    expect(result.current.cart.data?.find((item) => item.id === 1)).toBeUndefined();
  });

  test("updateQuantity 후 invalidate로 수량이 갱신된다", async () => {
    const { result } = renderCartWithMutations();
    await waitFor(() => expect(result.current.cart.data).toHaveLength(2));

    await act(async () => result.current.mutations.updateQuantity.mutate({ id: 2, quantity: 5 }));

    await waitFor(() => {
      const item = result.current.cart.data?.find((cartItem) => cartItem.id === 2);
      expect(item?.quantity).toBe(5);
    });
  });
});

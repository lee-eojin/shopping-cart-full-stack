import { useMutation } from "../../shared/api/useMutation.ts";
import { useQueryCache } from "../../shared/api/queryCacheContext.ts";
import { addToCart, updateQuantity, removeFromCart } from "../cartApi.ts";

export function useCartMutations() {
  const cache = useQueryCache();

  function invalidateCart() {
    return cache.invalidate(["cart"]);
  }

  const add = useMutation({ mutationFn: addToCart, onSettled: invalidateCart });
  const update = useMutation({ mutationFn: updateQuantity, onSettled: invalidateCart });
  const remove = useMutation({ mutationFn: removeFromCart, onSettled: invalidateCart });

  return { addToCart: add, updateQuantity: update, removeFromCart: remove };
}

import { useQuery } from "../../shared/api/useQuery.ts";
import { getCart } from "../cartApi.ts";
import type { CartItem } from "../types.ts";

export function useCart() {
  return useQuery<CartItem[]>({ queryKey: ["cart"], queryFn: getCart });
}

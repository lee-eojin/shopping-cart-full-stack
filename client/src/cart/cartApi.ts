import { apiRequest } from "../shared/api/client.ts";
import type { MessageResponse } from "../shared/types.ts";

import type { CartItem } from "./types.ts";

export function getCart(): Promise<CartItem[]> {
  return apiRequest<CartItem[]>("/cart");
}

export function addToCart(id: CartItem["id"]): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/cart/${id}`, { method: "POST" });
}

export function updateQuantity({ id, quantity }: Pick<CartItem, "id" | "quantity">): Promise<void> {
  return apiRequest<void>(`/cart/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function removeFromCart(id: CartItem["id"]): Promise<void> {
  return apiRequest<void>(`/cart/${id}`, { method: "DELETE" });
}

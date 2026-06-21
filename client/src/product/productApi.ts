import { apiRequest } from "../shared/api/client.ts";
import type { MessageResponse } from "../shared/types.ts";

import type { Product, CreateProductRequest } from "./types.ts";

export function getProducts(): Promise<Product[]> {
  return apiRequest<Product[]>("/products");
}

export function createProduct(body: CreateProductRequest): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteProduct(id: Product["id"]): Promise<void> {
  return apiRequest<void>(`/products/${id}`, { method: "DELETE" });
}

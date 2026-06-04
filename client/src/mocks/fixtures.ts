import type { Product } from "../product/types.ts";

export const products: Product[] = [
  { id: 1, imageUrl: "https://example.com/product-image.jpg", name: "상품명", price: 10000, quantity: 1 },
  { id: 2, imageUrl: "https://example.com/product2-image.jpg", name: "상품명2", price: 20000, quantity: 2 },
  { id: 3, imageUrl: "https://example.com/product3-image.jpg", name: "상품명3", price: 30000, quantity: 3 },
];

export const cart: Product[] = [
  { id: 1, imageUrl: "https://example.com/product-image.jpg", name: "상품명", price: 10000, quantity: 1 },
  { id: 2, imageUrl: "https://example.com/product2-image.jpg", name: "상품명2", price: 20000, quantity: 2 },
];

import { http, HttpResponse } from "msw";
import { products, cart as initialCart } from "./fixtures.ts";
import type { UpdateQuantityRequest } from "../cart/types.ts";

const PRODUCTS_URL = `${import.meta.env.VITE_API_BASE_URL}/products`;
const CART_URL = `${import.meta.env.VITE_API_BASE_URL}/cart`;

let cart = [...initialCart];

export const handlers = [
  http.get(PRODUCTS_URL, () => HttpResponse.json(products)),

  http.get(CART_URL, () => HttpResponse.json(cart)),

  http.post(`${CART_URL}/:id`, async ({ params }) => {
    const id = Number(params.id);
    const pickedProduct = products.find((product) => product.id === id);
    if (!pickedProduct) {
      return new HttpResponse(null, { status: 404 });
    }
    cart = [...cart, { ...pickedProduct, quantity: 1 }];
    return HttpResponse.json({ message: "장바구니에 추가되었습니다." }, { status: 201 });
  }),

  http.patch(`${CART_URL}/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const { quantity } = (await request.json()) as UpdateQuantityRequest;
    cart = cart.map((item) => (item.id === id ? { ...item, quantity } : item));
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${CART_URL}/:id`, async ({ params }) => {
    const id = Number(params.id);
    cart = cart.filter((item) => item.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];

export function resetCart() {
  cart = [...initialCart];
}

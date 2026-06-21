import { describe, test, expect } from "@jest/globals";
import { http, HttpResponse } from "msw";

import { server } from "../mocks/server.ts";

import { getCart, addToCart, updateQuantity, removeFromCart } from "./cartApi.ts";

const CART_URL = "http://localhost:8080/cart";

describe("cartApi", () => {
  test("getCart는 GET /cart 목록을 반환한다", async () => {
    const items = await getCart();
    expect(items).toHaveLength(2);
  });

  test("addToCart는 POST /cart/:id로 담고 메시지를 반환한다", async () => {
    const result = await addToCart(1);
    expect(result.message).toBeTruthy();
  });

  test("updateQuantity는 PATCH /cart/:id로 quantity만 보낸다", async () => {
    let body: unknown;
    server.use(
      http.patch(`${CART_URL}/1`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await updateQuantity({ id: 1, quantity: 5 });
    expect(body).toEqual({ quantity: 5 });
  });

  test("removeFromCart는 DELETE /cart/:id를 호출한다", async () => {
    let called = false;
    server.use(
      http.delete(`${CART_URL}/1`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await removeFromCart(1);
    expect(called).toBe(true);
  });
});

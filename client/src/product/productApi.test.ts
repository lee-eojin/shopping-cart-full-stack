import { describe, test, expect } from "@jest/globals";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server.ts";
import { getProducts, createProduct, deleteProduct } from "./productApi.ts";

const PRODUCTS_URL = "http://localhost:8080/products";

describe("productApi", () => {
  test("getProducts는 GET /products 목록을 반환한다", async () => {
    const products = await getProducts();
    expect(products).toHaveLength(3);
  });

  test("createProduct는 POST /products로 body를 보내고 메시지를 반환한다", async () => {
    let body: unknown;
    server.use(
      http.post(PRODUCTS_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: "추가됨" }, { status: 201 });
      }),
    );

    const result = await createProduct({ imageUrl: "x", name: "신상", price: 1000, quantity: 1 });
    expect(body).toMatchObject({ name: "신상", price: 1000 });
    expect(result.message).toBe("추가됨");
  });

  test("deleteProduct는 DELETE /products/:id를 호출한다", async () => {
    let called = false;
    server.use(
      http.delete(`${PRODUCTS_URL}/1`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await deleteProduct(1);
    expect(called).toBe(true);
  });
});

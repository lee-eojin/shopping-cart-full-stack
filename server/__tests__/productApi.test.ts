import express from "express";
import request from "supertest";
import { BodyForTest, TestDB } from "./testDB";
import { createProductRouter } from "../src/routes/product";

const app = express();
app.use(express.json());
app.use("/products", createProductRouter(TestDB));

const initialProducts = TestDB.Products!.map((product) => ({ ...product }));
const initialCart = TestDB.Cart!.map((product) => ({ ...product }));

beforeEach(() => {
  TestDB.Products = initialProducts.map((p) => ({ ...p }));
  TestDB.Cart = initialCart.map((p) => ({ ...p }));
});

describe("GET /products", function () {
  it("응답 body의 json의 길이는 2이며, 응답 상태코드는 200 OK 이다.", async function () {
    const response = await request(app).get("/products").set("Accept", "application/json");
    expect(response.status).toBe(200);
    expect(response.body.length).toEqual(2);
  });

  it("PRODUCTS 테이블에 존재하지 않으면 500 에러", async function () {
    TestDB.Products = undefined;

    const response = await request(app).get("/products").set("Accept", "application/json");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ errorMessage: "서버에 일시적인 오류가 발생했습니다." });
  });
});

const newProduct: BodyForTest = {
  imageUrl: "https://example.com/testItem.jpg",
  name: "Test Item",
  price: 10000,
  quantity: 5,
};

describe("POST /products", function () {
  it("새로운 상품이 등록되고, 응답 상태코드는 201 Created 이다.", async function () {
    const response = await request(app).post("/products").send(newProduct).set("Accept", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: "상품이 성공적으로 생성되었습니다." });
  });

  it("PRODUCTS 테이블이 존재하지 않으면 500 에러", async function () {
    TestDB.Products = undefined;

    const response = await request(app).post("/products").send(newProduct).set("Accept", "application/json");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ errorMessage: "서버에 일시적인 오류가 발생했습니다." });
  });

  it("잘못된 요청이 들어오면 400 에러이며, 상품이 DB에 추가되지 않는다.", async function () {
    const beforeLength = TestDB.Products!.length;
    const invalidProduct = { ...newProduct };
    invalidProduct.quantity = 0;
    const response = await request(app).post("/products").send(invalidProduct).set("Accept", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ errorMessage: "quantity는 1 이상 99 이하의 정수여야 합니다." });
    expect(TestDB.Products!.length).toBe(beforeLength);
  });
});

describe("DELETE /products/:id", function () {
  it("상품이 삭제되면, 응답 상태코드는 204 OK 이며 장바구니에 해당 상품이 있을 때 같이 삭제된다.", async function () {
    const response = await request(app).delete("/products/1").set("Accept", "application/json");
    expect(TestDB.Products!.length).toBe(1);
    expect(TestDB.Cart!.length).toBe(0);
    expect(response.status).toBe(204);
  });

  it("해당 id가 DB에 존재하지 않는다면 404 에러", async function () {
    const response = await request(app).delete("/products/3").set("Accept", "application/json");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ errorMessage: "상품을 찾을 수 없습니다." });
  });
});

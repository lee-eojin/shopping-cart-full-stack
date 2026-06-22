import request from "supertest";

import app from "../src/app";

describe("CORS", () => {
  test("개발 환경의 localhost 대체 포트를 허용한다", async () => {
    const response = await request(app).get("/cart").set("Origin", "http://localhost:3001");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
  });

  test("허용되지 않은 외부 origin은 응답 헤더에 반영하지 않는다", async () => {
    const response = await request(app).get("/cart").set("Origin", "https://example.com");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

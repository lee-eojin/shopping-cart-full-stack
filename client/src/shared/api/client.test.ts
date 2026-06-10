import { describe, test, expect } from "@jest/globals";
import { http, HttpResponse } from "msw";
import { apiRequest } from "./client.ts";
import { server } from "../../mocks/server.ts";

describe("apiRequest", () => {
  test("200 응답이면 JSON을 반환한다", async () => {
    server.use(http.get("http://localhost:8080/test", () => HttpResponse.json({ message: "ok" })));
    const result = await apiRequest<{ message: string }>("/test");
    expect(result).toEqual({ message: "ok" });
  });

  test("204 응답이면 undefined를 반환한다", async () => {
    server.use(http.delete("http://localhost:8080/test/1", () => new HttpResponse(null, { status: 204 })));
    const result = await apiRequest("/test/1", { method: "DELETE" });
    await expect(result).toBeUndefined();
  });

  test("4xx 응답이면 errorMessage를 Error로 던진다", async () => {
    server.use(
      http.get("http://localhost:8080/test", () =>
        HttpResponse.json({ errorMessage: "찾을 수 없습니다." }, { status: 404 }),
      ),
    );
    await expect(apiRequest("/test")).rejects.toThrow("찾을 수 없습니다.");
  });

  test("에러 응답에 body가 없으면 기본 메세지로 던진다", async () => {
    server.use(http.get("http://localhost:8080/test", () => new HttpResponse(null, { status: 500 })));
    await expect(apiRequest("/test")).rejects.toThrow("요청 처리 중 오류가 발생했습니다.");
  });
});

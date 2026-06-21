import { describe, test, expect, afterEach } from "@jest/globals";

import { saveToStorage, loadFromStorage } from "./storage.ts";

describe("storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  test("저장한 값을 그대로 읽어온다", () => {
    saveToStorage("cart-selection", { 1: true, 2: false });
    expect(loadFromStorage("cart-selection")).toEqual({ 1: true, 2: false });
  });

  test("아무도 저장 안한 키는 null을 반환한다", () => {
    expect(loadFromStorage("nonexistent-key")).toBeNull();
  });

  test("깨진 JSON이면 null을 반환한다", () => {
    localStorage.setItem("broken", "{이건 JSON 아님}");
    expect(loadFromStorage("broken")).toBeNull();
  });
});

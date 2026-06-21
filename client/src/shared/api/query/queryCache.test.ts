import { describe, test, expect, jest } from "@jest/globals";

import { QueryCache } from "./queryCache.ts";

describe("QueryCache", () => {
  test("조회한 적 없는 키의 상태는 undefined다", () => {
    const cache = new QueryCache();
    expect(cache.getState(["cart"])).toBeUndefined();
  });

  test("fetch 성공 시 success 상태와 data를 가진다", async () => {
    const cache = new QueryCache();
    await cache.fetch(["cart"], () => Promise.resolve([{ id: 1 }]));

    expect(cache.getState<{ id: number }[]>(["cart"])).toMatchObject({
      status: "success",
      data: [{ id: 1 }],
    });
  });

  test("fetch 진행 중에는 pending 상태다", () => {
    const cache = new QueryCache();
    cache.fetch(["cart"], () => new Promise(() => {}));
    expect(cache.getState(["cart"])?.status).toBe("pending");
  });

  test("fetch 실패 시 error 상태와 에러를 가진다", async () => {
    const cache = new QueryCache();
    await cache.fetch(["cart"], () => Promise.reject(new Error("실패")));

    const state = cache.getState(["cart"]);
    expect(state?.status).toBe("error");
    expect(state?.error?.message).toBe("실패");
  });

  test("재조회 중에도 직전 data는 유지된다", async () => {
    const cache = new QueryCache();
    await cache.fetch(["cart"], () => Promise.resolve([{ id: 1 }]));

    cache.fetch(["cart"], () => new Promise(() => {}));
    const state = cache.getState<{ id: number }[]>(["cart"]);
    expect(state?.status).toBe("pending");
    expect(state?.data).toEqual([{ id: 1 }]);
  });

  test("상태가 바뀌면 구독자에게 알린다", async () => {
    const cache = new QueryCache();
    const listener = jest.fn();
    cache.subscribe(["cart"], listener);

    await cache.fetch(["cart"], () => Promise.resolve([]));
    expect(listener).toHaveBeenCalled();
  });

  test("구독 해제 후에는 알리지 않는다", async () => {
    const cache = new QueryCache();
    const listener = jest.fn();
    const unsubscribe = cache.subscribe(["cart"], listener);
    unsubscribe();

    await cache.fetch(["cart"], () => Promise.resolve([]));
    expect(listener).not.toHaveBeenCalled();
  });

  test("상태 객체는 변경 전까지 같은 참조를 유지한다", async () => {
    const cache = new QueryCache();
    await cache.fetch(["cart"], () => Promise.resolve([]));

    expect(cache.getState(["cart"])).toBe(cache.getState(["cart"]));
  });

  test("invalidate는 마지막 queryFn으로 재조회한다", async () => {
    const cache = new QueryCache();
    const queryFn = jest.fn<() => Promise<number>>().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    await cache.fetch(["count"], queryFn);
    expect(cache.getState<number>(["count"])?.data).toBe(1);

    await cache.invalidate(["count"]);
    expect(cache.getState<number>(["count"])?.data).toBe(2);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  test("조회한 적 없는 키의 invalidate는 아무 일도 하지 않는다", async () => {
    const cache = new QueryCache();
    await expect(cache.invalidate(["unknown"])).resolves.toBeUndefined();
  });
});

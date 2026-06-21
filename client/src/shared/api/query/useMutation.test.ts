import { describe, test, expect, jest } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";

import { useMutation } from "./useMutation.ts";

describe("useMutation", () => {
  test("mutate는 변수를 mutationFn에 그대로 넘긴다", async () => {
    const mutationFn = jest.fn<(vars: { id: number }) => Promise<void>>().mockResolvedValue();
    const { result } = renderHook(() => useMutation({ mutationFn }));

    await act(async () => result.current.mutate({ id: 1 }));
    expect(mutationFn).toHaveBeenCalledWith({ id: 1 });
    expect(result.current.error).toBeUndefined();
  });

  test("성공이든 실패든 onSettled를 호출한다", async () => {
    const onSettled = jest.fn<() => void>();
    const failing = renderHook(() =>
      useMutation({
        mutationFn: () => Promise.reject(new Error("실패")),
        onSettled,
      }),
    );

    await act(async () => failing.result.current.mutate());
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(failing.result.current.error?.message).toBe("실패");
  });

  test("성공 시 error는 비어 있다", async () => {
    const onSettled = jest.fn<() => void>();
    const { result } = renderHook(() =>
      useMutation({ mutationFn: () => Promise.resolve(), onSettled }),
    );

    await act(async () => result.current.mutate());
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });
});

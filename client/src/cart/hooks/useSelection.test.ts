import { describe, test, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";

import { useSelection } from "./useSelection.ts";

beforeEach(() => localStorage.clear());

describe("useSelection", () => {
  test("저장된 적 없는 상품은 기본 선택(true)이다", () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.isSelected(1)).toBe(true);
  });

  test("select로 개별 선택을 해제한다", () => {
    const { result } = renderHook(() => useSelection());

    act(() => result.current.select(1, false));
    expect(result.current.isSelected(1)).toBe(false);
  });

  test("setAll로 여러 상품을 한 번에 바꾼다", () => {
    const { result } = renderHook(() => useSelection());

    act(() => result.current.setAll([1, 2, 3], false));
    expect(result.current.isSelected(1)).toBe(false);
    expect(result.current.isSelected(2)).toBe(false);
    expect(result.current.isSelected(3)).toBe(false);
  });

  test("선택 상태가 localStorage에 저장되어 재마운트 후 복원된다", () => {
    const first = renderHook(() => useSelection());
    act(() => first.result.current.select(1, false));

    const second = renderHook(() => useSelection());
    expect(second.result.current.isSelected(1)).toBe(false);
  });
});

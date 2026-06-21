import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SelectAll } from "./SelectAll.tsx";

describe("SelectAll", () => {
  test("checked 상태를 체크박스에 반영한다", () => {
    render(<SelectAll checked onSelectAll={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "전체 선택" })).toBeChecked();
  });

  test("체크된 것을 해제하면 onSelectAll(false)가 호출된다", async () => {
    const onSelectAll = jest.fn();
    render(<SelectAll checked onSelectAll={onSelectAll} />);

    await userEvent.click(screen.getByRole("checkbox"));
    expect(onSelectAll).toHaveBeenCalledWith(false);
  });

  test("해제된 것을 체크하면 onSelectAll(true)가 호출된다", async () => {
    const onSelectAll = jest.fn();
    render(<SelectAll checked={false} onSelectAll={onSelectAll} />);

    await userEvent.click(screen.getByRole("checkbox"));
    expect(onSelectAll).toHaveBeenCalledWith(true);
  });
});

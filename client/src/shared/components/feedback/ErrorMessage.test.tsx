import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorMessage } from "./ErrorMessage.tsx";

describe("ErrorMessage", () => {
  test("전달한 메시지를 보여준다", () => {
    render(<ErrorMessage message="불러오지 못했습니다" onRetry={() => {}} />);
    expect(screen.getByText("불러오지 못했습니다")).toBeInTheDocument();
  });

  test("메시지를 안 주면 기본 메시지를 보여준다", () => {
    render(<ErrorMessage onRetry={() => {}} />);
    expect(screen.getByText("문제가 발생했습니다.")).toBeInTheDocument();
  });

  test("다시 시도 버튼을 누르면 onRetry가 호출된다", async () => {
    const onRetry = jest.fn();
    render(<ErrorMessage onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

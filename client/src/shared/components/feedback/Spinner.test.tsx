import "@testing-library/jest-dom/jest-globals";
import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner.tsx";

describe("Spinner", () => {
  test("로딩 상태를 알리는 status 역할을 가진다", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: "로딩 중" })).toBeInTheDocument();
  });
});

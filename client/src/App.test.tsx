import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders shop heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "SHOP" })).toBeInTheDocument();
});

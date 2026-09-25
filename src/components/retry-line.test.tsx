import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { RetryLine } from "@/components/retry-line";

afterEach(cleanup);

describe("RetryLine", () => {
  test("renders a disabled retry until released", () => {
    const retry = vi.fn();
    render(
      <RetryLine message="Try later" tone="warn" onRetry={retry} retryLabel="Try again" disabled />,
    );

    const button = screen.getByRole("button", { name: "Try again" });
    expect(button.getAttribute("disabled")).toBe("");
    fireEvent.click(button);
    expect(retry).not.toHaveBeenCalled();
  });

  test("calls retry when enabled", () => {
    const retry = vi.fn();
    render(<RetryLine message="Failed" tone="error" onRetry={retry} retryLabel="Try again" />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { useCountdown } from "@/hooks/use-countdown";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  test("counts down from mount and stops at zero", async () => {
    const { result } = renderHook(() => useCountdown(3));

    expect(result.current).toBe(3);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(0);
  });

  test("a fresh mount starts over", async () => {
    const first = renderHook(() => useCountdown(60));
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(first.result.current).toBe(50);
    first.unmount();

    const second = renderHook(() => useCountdown(60));
    expect(second.result.current).toBe(60);
    second.unmount();
  });
});

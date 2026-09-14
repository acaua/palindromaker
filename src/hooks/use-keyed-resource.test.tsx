import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vite-plus/test";

import { useKeyedResource } from "@/hooks/use-keyed-resource";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; value: string }
  | { status: "error" };

const fallbacks = {
  idle: { status: "idle" } as State,
  loading: { status: "loading" } as State,
  error: { status: "error" } as State,
};

const deferred = () => {
  let resolve!: (value: State) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<State>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("useKeyedResource", () => {
  test("a null key loads nothing and is idle", () => {
    const load = vi.fn();
    const { result } = renderHook(() => useKeyedResource<State>(null, load, fallbacks));

    expect(result.current.state).toEqual({ status: "idle" });
    expect(load).not.toHaveBeenCalled();
  });

  test("a null key without an idle fallback is loading", () => {
    const { result } = renderHook(() =>
      useKeyedResource<State>(null, vi.fn(), {
        loading: fallbacks.loading,
        error: fallbacks.error,
      }),
    );

    expect(result.current.state).toEqual({ status: "loading" });
  });

  test("resolves to the value for the current key", async () => {
    const load = deferred();
    const { result } = renderHook(() =>
      useKeyedResource<State>("a", () => load.promise, fallbacks),
    );

    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => load.resolve({ status: "ready", value: "hi" }));
    expect(result.current.state).toEqual({ status: "ready", value: "hi" });
  });

  test("a rejection becomes the error fallback", async () => {
    const load = deferred();
    const { result } = renderHook(() =>
      useKeyedResource<State>("a", () => load.promise, fallbacks),
    );

    await act(async () => load.reject(new Error("boom")));
    expect(result.current.state).toEqual({ status: "error" });
  });

  test("a response for a previous key never replaces a newer one", async () => {
    const first = deferred();
    const second = deferred();
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) =>
        useKeyedResource<State>(
          key,
          () => (key === "a" ? first.promise : second.promise),
          fallbacks,
        ),
      { initialProps: { key: "a" } },
    );

    rerender({ key: "b" });
    expect(result.current.state).toEqual({ status: "loading" });

    // the old key finally answers, long after the user moved on
    await act(async () => first.resolve({ status: "ready", value: "a" }));
    expect(result.current.state).toEqual({ status: "loading" });

    await act(async () => second.resolve({ status: "ready", value: "b" }));
    expect(result.current.state).toEqual({ status: "ready", value: "b" });
  });

  test("retry re-runs the load and clears the error", async () => {
    const load = vi
      .fn<() => Promise<State>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ status: "ready", value: "hi" });
    const { result } = renderHook(() => useKeyedResource<State>("a", load, fallbacks));

    await waitFor(() => expect(result.current.state).toEqual({ status: "error" }));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", value: "hi" }));
    expect(load).toHaveBeenCalledTimes(2);
  });
});

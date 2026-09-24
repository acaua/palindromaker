import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { clearSharedRequests, sharedRequest } from "@/lib/shared-request";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

afterEach(() => {
  clearSharedRequests();
  vi.useRealTimers();
});

describe("sharedRequest", () => {
  test("deduplicates a StrictMode-sized consumer group and keeps the physical request", async () => {
    const request = deferred<string>();
    const scope = {};
    const run = vi.fn(() => request.promise);
    const firstController = new AbortController();
    const first = sharedRequest(scope, "page", run, firstController.signal);
    const firstExpectation = expect(first).rejects.toBeDefined();
    firstController.abort();

    const second = sharedRequest(scope, "page", run);
    expect(run).toHaveBeenCalledTimes(1);
    request.resolve("ok");

    await firstExpectation;
    await expect(second).resolves.toBe("ok");
  });

  test("aborting one consumer does not abort another consumer", async () => {
    const request = deferred<string>();
    const scope = {};
    const controller = new AbortController();
    const first = sharedRequest(scope, "page", () => request.promise, controller.signal);
    const firstExpectation = expect(first).rejects.toBeDefined();
    const second = sharedRequest(scope, "page", () => request.promise);
    controller.abort();
    request.resolve("ok");

    await firstExpectation;
    await expect(second).resolves.toBe("ok");
  });

  test("does not start a request for an already-aborted consumer", async () => {
    const controller = new AbortController();
    controller.abort();
    const run = vi.fn(() => Promise.resolve("late"));

    await expect(sharedRequest({}, "page", run, controller.signal)).rejects.toBeDefined();
    expect(run).not.toHaveBeenCalled();
  });

  test("aborts the physical request after the last consumer leaves", async () => {
    vi.useFakeTimers();
    const scope = {};
    const request = deferred<string>();
    const controller = new AbortController();
    let physicalSignal: AbortSignal | undefined;
    const result = sharedRequest(
      scope,
      "page",
      (signal) => {
        physicalSignal = signal;
        return request.promise;
      },
      controller.signal,
    );
    const expectation = expect(result).rejects.toBeDefined();
    controller.abort();
    await vi.runAllTimersAsync();

    await expectation;
    expect(physicalSignal?.aborted).toBe(true);
  });

  test("does not share requests across transport scopes", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const firstRun = vi.fn(() => first.promise);
    const secondRun = vi.fn(() => second.promise);
    const firstResult = sharedRequest({}, "page", firstRun);
    const secondResult = sharedRequest({}, "page", secondRun);

    expect(firstRun).toHaveBeenCalledTimes(1);
    expect(secondRun).toHaveBeenCalledTimes(1);
    first.resolve("first");
    second.resolve("second");
    await expect(firstResult).resolves.toBe("first");
    await expect(secondResult).resolves.toBe("second");
  });
});

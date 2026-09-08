import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useDictionary } from "@/hooks/use-dictionary";
import { buildDictionary, loadDictionary } from "@/lib/dictionary";
import type { Dictionary, Language } from "@/lib/dictionary";

// the real loader fetches megabytes and caches the promise per language;
// every other export (buildDictionary here) stays real
vi.mock("@/lib/dictionary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dictionary")>()),
  loadDictionary: vi.fn(),
}));

// Each load hands the test the controls to its own promise, so a response
// can be delivered late (or never) — which is the whole point of the
// hook's staleness guard.
interface Pending {
  resolve: (dictionary: Dictionary) => void;
  reject: (error: Error) => void;
}

// the newest load per language, which is the one the hook is waiting on
let pending: Map<Language, Pending>;

const loadOf = (language: Language): Pending => {
  const load = pending.get(language);
  if (!load) throw new Error(`no load started for ${language}`);
  return load;
};

beforeEach(() => {
  pending = new Map();
  vi.mocked(loadDictionary).mockReset();
  vi.mocked(loadDictionary).mockImplementation(
    (language) =>
      new Promise((resolve, reject) => {
        pending.set(language, { resolve, reject });
      }),
  );
});

describe("useDictionary", () => {
  test("loads nothing until enabled", async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useDictionary("en", enabled),
      { initialProps: { enabled: false } },
    );

    expect(result.current).toEqual({ status: "idle" });
    expect(loadDictionary).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(result.current).toEqual({ status: "loading" });

    await act(async () => loadOf("en").resolve(buildDictionary("hello")));
    expect(result.current.status).toBe("ready");
  });

  test("closing the panel goes back to idle without dropping the load", async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useDictionary("en", enabled),
      { initialProps: { enabled: true } },
    );

    await act(async () => loadOf("en").resolve(buildDictionary("hello")));
    expect(result.current.status).toBe("ready");

    rerender({ enabled: false });
    expect(result.current).toEqual({ status: "idle" });

    // reopening shows the words again rather than reloading from scratch
    rerender({ enabled: true });
    expect(result.current.status).toBe("ready");
  });

  test("a response for the previous language never replaces a newer one", async () => {
    const { result, rerender } = renderHook(
      ({ language }: { language: Language }) => useDictionary(language, true),
      { initialProps: { language: "pt-br" } },
    );

    rerender({ language: "en" });
    expect(result.current).toEqual({ status: "loading" });

    // pt-br finally answers, long after the user moved on
    await act(async () => loadOf("pt-br").resolve(buildDictionary("ovo")));
    expect(result.current).toEqual({ status: "loading" });

    await act(async () => loadOf("en").resolve(buildDictionary("hello")));
    expect(result.current).toMatchObject({
      status: "ready",
      dictionary: { words: ["hello"] },
    });
  });

  test("switching back to a language that already answered shows it at once", async () => {
    const { result, rerender } = renderHook(
      ({ language }: { language: Language }) => useDictionary(language, true),
      { initialProps: { language: "pt-br" } },
    );

    await act(async () => loadOf("pt-br").resolve(buildDictionary("ovo")));
    rerender({ language: "en" });
    expect(result.current).toEqual({ status: "loading" });

    // the last outcome is still pt-br's, so going back needs no loading
    // flash — the underlying loader caches the built dictionary anyway
    rerender({ language: "pt-br" });
    expect(result.current).toMatchObject({
      status: "ready",
      dictionary: { words: ["ovo"] },
    });
  });

  test("a failed load offers a retry, and the retry can succeed", async () => {
    const { result } = renderHook(() => useDictionary("en", true));

    await act(async () => loadOf("en").reject(new Error("offline")));
    expect(result.current.status).toBe("error");

    act(() => {
      if (result.current.status === "error") result.current.retry();
    });
    // the answer that already arrived belongs to the previous attempt
    expect(result.current).toEqual({ status: "loading" });
    expect(loadDictionary).toHaveBeenCalledTimes(2);

    await act(async () => loadOf("en").resolve(buildDictionary("hello")));
    expect(result.current.status).toBe("ready");
  });

  test("a failed load can fail again", async () => {
    const { result } = renderHook(() => useDictionary("en", true));

    await act(async () => loadOf("en").reject(new Error("offline")));
    const first = result.current;
    expect(first.status).toBe("error");

    act(() => {
      if (first.status === "error") first.retry();
    });
    await act(async () => loadOf("en").reject(new Error("still offline")));
    expect(result.current.status).toBe("error");
  });
});

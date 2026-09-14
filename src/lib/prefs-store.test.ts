import { describe, expect, test, vi } from "vite-plus/test";

import { MemoryStorage } from "@/test/storages";
import { DEFAULT_PREFS, readPrefs } from "./prefs";

// the runtime store holds module state, so each case re-imports it fresh
// rather than inheriting another case's binding
const freshStore = async () => {
  vi.resetModules();
  return import("./prefs-store");
};

describe("prefsStore", () => {
  test("initPrefs binds the store to the given storage, once", async () => {
    const { initPrefs, prefsStore } = await freshStore();
    const storage = new MemoryStorage();

    const prefs = initPrefs(storage);
    prefs.write({ mirrorEnabled: true });

    // the same store answers every later call
    expect(prefsStore()).toBe(prefs);
    expect(readPrefs(storage).mirrorEnabled).toBe(true);
  });

  test("falls back to browser storage when nothing was injected", async () => {
    const { prefsStore } = await freshStore();

    // node has no localStorage: the store binds the null guard instead of
    // throwing, so reads answer the defaults and writes are best effort
    const prefs = prefsStore();

    expect(prefs.read()).toEqual(DEFAULT_PREFS);
    expect(() => prefs.write({ lang: "de" })).not.toThrow();
  });
});

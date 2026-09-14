import { describe, expect, test } from "vite-plus/test";

import { FailingStorage, MemoryStorage, ThrowingStorage } from "@/test/storages";
import { DEFAULT_PREFS, prefsFor, PREFS_STORAGE_KEY, readPrefs, writePrefs } from "./prefs";

describe("readPrefs", () => {
  test("returns the defaults when storage is unavailable or key is absent", () => {
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(readPrefs(new MemoryStorage())).toEqual(DEFAULT_PREFS);
  });

  test("returns the stored prefs", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        lang: "en",
        uiLang: "es",
        mirrorEnabled: true,
        finderOpen: false,
      }),
    );

    expect(readPrefs(storage)).toEqual({
      lang: "en",
      uiLang: "es",
      mirrorEnabled: true,
      finderOpen: false,
    });
  });

  test("drops unknown languages and mistyped values", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        lang: "xx",
        // the dictionary's pt code is not a UI language ("pt" is)
        uiLang: "pt-br",
        mirrorEnabled: "yes",
        finderOpen: "open",
      }),
    );

    expect(readPrefs(storage)).toEqual(DEFAULT_PREFS);
  });

  test("returns the defaults for corrupt JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(PREFS_STORAGE_KEY, "not json");

    expect(readPrefs(storage)).toEqual(DEFAULT_PREFS);
  });

  test("returns the defaults when storage refuses to be read", () => {
    expect(readPrefs(new ThrowingStorage())).toEqual(DEFAULT_PREFS);
  });
});

describe("writePrefs", () => {
  test("merges the patch into the stored prefs", () => {
    const storage = new MemoryStorage();
    writePrefs(storage, { lang: "de" });
    writePrefs(storage, { mirrorEnabled: true });
    writePrefs(storage, { finderOpen: false });

    expect(readPrefs(storage)).toEqual({
      lang: "de",
      mirrorEnabled: true,
      finderOpen: false,
    });
  });

  test("stores only the keys actually written, never the defaults", () => {
    const storage = new MemoryStorage();
    writePrefs(storage, { uiLang: "es" });

    expect(JSON.parse(storage.getItem(PREFS_STORAGE_KEY) ?? "{}")).toEqual({ uiLang: "es" });
    // reads still see the defaults alongside
    expect(readPrefs(storage)).toEqual({ ...DEFAULT_PREFS, uiLang: "es" });
  });

  test("swallows storage failures", () => {
    const storage = new FailingStorage();

    expect(() => writePrefs(storage, { lang: "de" })).not.toThrow();
  });

  test("does nothing when storage is unavailable", () => {
    expect(() => writePrefs(null, { lang: "de" })).not.toThrow();
  });
});

describe("prefsFor", () => {
  test("reads and writes through the storage it was bound to", () => {
    const prefs = prefsFor(new MemoryStorage());
    prefs.write({ mirrorEnabled: true });

    expect(prefs.read()).toEqual({ ...DEFAULT_PREFS, mirrorEnabled: true });
  });
});

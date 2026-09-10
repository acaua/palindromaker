import { describe, expect, test, vi } from "vite-plus/test";

import {
  DEFAULT_UI_LANGUAGE,
  UI_LANGUAGES,
  UI_LANGUAGE_LABELS,
  UI_LANGUAGE_LOCALES,
  UI_LANGUAGE_TAGS,
  getUiLanguage,
  initUiLanguage,
  messages,
  resolveUiLanguage,
  setUiLanguage,
  subscribeUiLanguage,
  translate,
} from "@/lib/i18n";

describe("resolveUiLanguage", () => {
  test("the stored pref wins over detection", () => {
    expect(resolveUiLanguage("pt", ["en-US"])).toBe("pt");
    expect(resolveUiLanguage("de", ["pt-BR"])).toBe("de");
  });

  test("unknown stored values fall through to detection", () => {
    expect(resolveUiLanguage("xx", ["en-US"])).toBe("en");
    expect(resolveUiLanguage(42, ["pt-BR"])).toBe("pt");
  });

  test("matches the browser's tags on the primary subtag", () => {
    expect(resolveUiLanguage(undefined, ["pt-BR", "en"])).toBe("pt");
    expect(resolveUiLanguage(undefined, ["en-GB", "pt"])).toBe("en");
    expect(resolveUiLanguage(undefined, ["es", "pt-BR"])).toBe("es");
    expect(resolveUiLanguage(undefined, ["de-DE", "es"])).toBe("de");
    expect(resolveUiLanguage(undefined, ["fr-CA", "de"])).toBe("fr");
    expect(resolveUiLanguage(undefined, ["it-IT", "fr"])).toBe("it");
  });

  test("defaults to pt when detection finds no supported language", () => {
    expect(resolveUiLanguage(undefined, ["ja", "zh"])).toBe(DEFAULT_UI_LANGUAGE);
    expect(resolveUiLanguage(undefined, null)).toBe(DEFAULT_UI_LANGUAGE);
    expect(DEFAULT_UI_LANGUAGE).toBe("pt");
  });
});

describe("translate", () => {
  test("every language answers every key", () => {
    const enKeys = Object.keys(messages.en).sort();
    for (const lang of UI_LANGUAGES) {
      expect(lang in messages).toBe(true);
      expect(Object.keys(messages[lang]).sort()).toEqual(enKeys);
      expect(lang in UI_LANGUAGE_LABELS).toBe(true);
      expect(lang in UI_LANGUAGE_LOCALES).toBe(true);
      expect(lang in UI_LANGUAGE_TAGS).toBe(true);
    }
    expect([...UI_LANGUAGES]).toEqual(["pt", "en", "es", "de", "fr", "it"]);
  });

  test("the document-language tag is pt-BR for the pt UI code", () => {
    expect(UI_LANGUAGE_TAGS.pt).toBe("pt-BR");
    expect(UI_LANGUAGE_TAGS.en).toBe("en");
  });

  test("looks up the string in the requested language", () => {
    expect(translate("en", "status.palindrome")).toBe("Palindrome");
    expect(translate("pt", "status.palindrome")).toBe("Palíndromo");
    expect(translate("es", "status.palindrome")).toBe("Palíndromo");
    expect(translate("de", "status.palindrome")).toBe("Palindrom");
    expect(translate("fr", "status.palindrome")).toBe("Palindrome");
    expect(translate("it", "status.palindrome")).toBe("Palindromo");
  });

  test("fills {count} placeholders", () => {
    expect(translate("en", "finder.resultMany", { count: "1.234" })).toBe("1.234 results");
    expect(translate("pt", "finder.resultOne", { count: "1" })).toBe("1 resultado");
    expect(translate("de", "finder.resultMany", { count: "12" })).toBe("12 Ergebnisse");
  });

  test("an unknown placeholder passes through instead of vanishing", () => {
    expect(translate("en", "finder.resultMany", { other: "x" })).toBe("{count} results");
  });
});

describe("the language store", () => {
  // these build on module state (initialized/current), so they must run
  // in file order: init first, then the switch tests. Vitest keeps that
  // order; a test that inits earlier would break the "runs once" case.
  test("init applies the stored pref, falling back to detection", () => {
    expect(initUiLanguage(undefined, ["ja"])).toBe(DEFAULT_UI_LANGUAGE);
  });

  test("init runs once: later calls never second-guess a switch", () => {
    // the store was initialized to the default above; a later stored pref
    // (from another App render) must not override a runtime switch
    setUiLanguage("en");
    expect(initUiLanguage("pt")).toBe("en");
  });

  test("setUiLanguage notifies subscribers, skipping no-op switches", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeUiLanguage(listener);

    setUiLanguage("pt");
    expect(getUiLanguage()).toBe("pt");
    expect(listener).toHaveBeenCalledTimes(1);

    setUiLanguage("pt");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setUiLanguage("en");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

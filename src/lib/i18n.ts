// UI language: the same six the word finder's dictionaries cover (the
// pt-br dictionary maps to the "pt" UI code). Framework-agnostic: a
// message table, browser language detection, and a tiny store that React
// reads through useSyncExternalStore (src/hooks/use-i18n.ts). The
// dictionary language is a separate concept (Language in dictionary.ts)
// and a separate pref (lang vs uiLang in persistence.ts).
export const UI_LANGUAGES = ["pt", "en", "es", "de", "fr", "it"] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

// the browser's language decides when nothing is stored, pt by design
export const DEFAULT_UI_LANGUAGE: UiLanguage = "pt";

// native names, the same convention as the dictionary's LANGUAGES
export const UI_LANGUAGE_LABELS: Record<UiLanguage, string> = {
  pt: "português",
  en: "english",
  es: "español",
  de: "deutsch",
  fr: "français",
  it: "italiano",
};

// number formatting (result counts) follows the UI language, not the
// browser's
export const UI_LANGUAGE_LOCALES: Record<UiLanguage, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
};

// the document-language tags for <html lang> (voice selection et al.);
// the pt UI code stays generic, but its strings, dictionary and sample
// are Brazilian, so the document says pt-BR — matching index.html
export const UI_LANGUAGE_TAGS: Record<UiLanguage, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
  de: "de",
  fr: "fr",
  it: "it",
};

import { de } from "@/lib/messages/de";
import { en } from "@/lib/messages/en";
import type { MessageKey, Table } from "@/lib/messages/en";
import { es } from "@/lib/messages/es";
import { fr } from "@/lib/messages/fr";
import { it } from "@/lib/messages/it";
import { pt } from "@/lib/messages/pt";

export type { MessageKey } from "@/lib/messages/en";

export const messages: Record<UiLanguage, Table> = { en, pt, es, de, fr, it };

export const translate = (lang: UiLanguage, key: MessageKey): string => messages[lang][key];

// substitutes a preformatted value into a "{count}" placeholder; each
// caller formats its own number (locale digits for counts, plain for the
// cooldown's seconds)
const fillCount = (template: string, value: string): string => template.replace("{count}", value);

// "{count} results" / "{count} resultados": the wording is per-language
// data (finder.resultOne/finder.resultMany, pluralized by count), the
// number follows the result language's locale
export const resultCount = (lang: UiLanguage, count: number): string =>
  fillCount(
    messages[lang][count === 1 ? "finder.resultOne" : "finder.resultMany"],
    count.toLocaleString(UI_LANGUAGE_LOCALES[lang]),
  );

// "Try again in 42s": the retry cooldown's remaining seconds
export const retryIn = (lang: UiLanguage, seconds: number): string =>
  fillCount(messages[lang]["explore.retryIn"], String(seconds));

const isUiLanguage = (value: unknown): value is UiLanguage =>
  typeof value === "string" && (UI_LANGUAGES as readonly string[]).includes(value);

// pure so tests can drive it: the stored pref wins, then the browser's
// BCP-47 tags matched on the primary subtag, then the default
export const resolveUiLanguage = (
  stored: unknown,
  detected: readonly string[] | null,
): UiLanguage => {
  if (isUiLanguage(stored)) return stored;
  for (const tag of detected ?? []) {
    const primary = tag.toLowerCase().split("-")[0];
    if (isUiLanguage(primary)) return primary;
  }
  return DEFAULT_UI_LANGUAGE;
};

// the browser's language list, or null where there is none (node, tests)
const navigatorLanguages = (): readonly string[] | null => {
  if (typeof navigator === "undefined") return null;
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages;
  if (navigator.language) return [navigator.language];
  return null;
};

// The store. The module defaults to "en" so unit tests that render
// components without initializing see the English strings they assert on;
// the app path always goes through initUiLanguage, whose fallback is pt.
let current: UiLanguage = "en";
let initialized = false;
const listeners = new Set<() => void>();

export const getUiLanguage = (): UiLanguage => current;

export const subscribeUiLanguage = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setUiLanguage = (lang: UiLanguage): void => {
  if (lang === current) return;
  current = lang;
  for (const listener of listeners) listener();
};

// applies the stored pref (falling back to browser detection) once per
// page load; App calls this before anything reads the language. After the
// first call it is a no-op, so re-renders never second-guess a switch.
export const initUiLanguage = (
  stored: unknown,
  detected: readonly string[] | null = navigatorLanguages(),
): UiLanguage => {
  if (!initialized) {
    initialized = true;
    current = resolveUiLanguage(stored, detected);
  }
  return current;
};

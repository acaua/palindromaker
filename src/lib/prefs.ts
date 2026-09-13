import { LANGUAGES } from "@/lib/dictionary";
import type { Language } from "@/lib/dictionary";
import { UI_LANGUAGES } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/i18n";
import { readJson } from "@/lib/storage";
import type { StorageLike } from "@/lib/storage";

export const PREFS_STORAGE_KEY = "palindromaker:prefs:v1";

// one owner for the preference keys, their types and their defaults.
// Every stored value is optional; a missing or unrecognized one falls back
// to the default below — except uiLang, which has none: the stored pref
// wins, else the browser's languages are detected, else the app default.
export interface Prefs {
  lang?: Language;
  uiLang?: UiLanguage;
  mirrorEnabled?: boolean;
  finderOpen?: boolean;
}

export const DEFAULT_PREFS = {
  lang: "pt-br",
  mirrorEnabled: false,
  finderOpen: true,
} as const;

export interface DefaultedPrefs extends Prefs {
  lang: Language;
  mirrorEnabled: boolean;
  finderOpen: boolean;
}

// loads UI preferences, keeping only recognized languages and booleans;
// anything unexpected falls back to the defaults above
export const readPrefs = (storage: StorageLike | null): DefaultedPrefs => {
  const parsed = readJson(storage, PREFS_STORAGE_KEY);
  if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_PREFS };

  const { lang, uiLang, mirrorEnabled, finderOpen } = parsed as {
    lang?: unknown;
    uiLang?: unknown;
    mirrorEnabled?: unknown;
    finderOpen?: unknown;
  };
  const prefs: Prefs = {};
  if (typeof lang === "string" && LANGUAGES.some((info) => info.code === lang)) {
    prefs.lang = lang as Language;
  }
  if (typeof uiLang === "string" && (UI_LANGUAGES as readonly string[]).includes(uiLang)) {
    prefs.uiLang = uiLang as UiLanguage;
  }
  if (typeof mirrorEnabled === "boolean") {
    prefs.mirrorEnabled = mirrorEnabled;
  }
  if (typeof finderOpen === "boolean") {
    prefs.finderOpen = finderOpen;
  }
  return { ...DEFAULT_PREFS, ...prefs };
};

// merges a patch into the stored UI preferences: best effort, so storage
// failures never break the interaction that triggered the write
export const writePrefs = (storage: StorageLike | null, patch: Prefs): void => {
  if (!storage) return;
  try {
    const merged = { ...readPrefs(storage), ...patch };
    storage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // storage full or blocked: best effort, keep going
  }
};

// The storage-bound view every component uses, so a call site no longer
// pairs localStorageOrNull() with the codec itself: one module owns the
// key, the shape and the merge.
export interface PrefsStore {
  read: () => DefaultedPrefs;
  write: (patch: Prefs) => void;
}

export const prefsFor = (storage: StorageLike | null): PrefsStore => ({
  read: () => readPrefs(storage),
  write: (patch) => writePrefs(storage, patch),
});

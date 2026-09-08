import type { JSONContent } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";

import { LANGUAGES } from "@/lib/dictionary";
import type { Language } from "@/lib/dictionary";

export const DOC_STORAGE_KEY = "palindromaker:doc:v1";
export const PREFS_STORAGE_KEY = "palindromaker:prefs:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

// the browser's localStorage, or null when it cannot be used. Reading
// window.localStorage *throws* (rather than returning null) when the
// browser blocks site storage — inside an iframe, or with cookies
// disabled — so every call site goes through here instead of touching
// the global and taking the app down before it renders
export const localStorageOrNull = (): StorageLike | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

// reads and parses a stored value; undefined when storage is unavailable,
// the key is absent, or the value is not JSON — callers fall back to
// their own defaults
const readJson = (
  storage: Pick<Storage, "getItem"> | null,
  key: string,
): unknown => {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
};

export interface Prefs {
  lang?: Language;
  mirrorEnabled?: boolean;
}

export interface PersistenceEditor {
  getJSON: () => JSONContent;
  on: (event: "update" | "destroy", handler: () => void) => unknown;
  off: (event: "update" | "destroy", handler: () => void) => unknown;
}

export interface PersistenceOptions {
  storage: StorageLike | null;
  delay?: number;
}

// the stored doc is always written by editor.getJSON(), so requiring a
// non-empty content array keeps corrupt or foreign data out; anything
// else falls back to the sample content
const isStoredDoc = (value: unknown): value is JSONContent => {
  if (typeof value !== "object" || value === null) return false;
  const { type, content } = value as { type?: unknown; content?: unknown };
  return type === "doc" && Array.isArray(content) && content.length > 0;
};

export const readStoredDoc = (
  storage: Pick<Storage, "getItem"> | null,
  schema: Schema,
): JSONContent | null => {
  const parsed = readJson(storage, DOC_STORAGE_KEY);
  if (!isStoredDoc(parsed)) return null;
  try {
    // parseable JSON that the editor's schema cannot represent (unknown
    // node/mark types, broken structure) would crash nodeFromJSON during
    // render and take the whole app down on every reload; reject it here
    schema.nodeFromJSON(parsed).check();
  } catch {
    return null;
  }
  return parsed;
};

// loads UI preferences, keeping only recognized languages and booleans;
// anything unexpected falls back to defaults chosen by the callers
export const readStoredPrefs = (storage: StorageLike | null): Prefs => {
  const parsed = readJson(storage, PREFS_STORAGE_KEY);
  if (typeof parsed !== "object" || parsed === null) return {};

  const { lang, mirrorEnabled } = parsed as {
    lang?: unknown;
    mirrorEnabled?: unknown;
  };
  const prefs: Prefs = {};
  if (
    typeof lang === "string" &&
    LANGUAGES.some((info) => info.code === lang)
  ) {
    prefs.lang = lang as Language;
  }
  if (typeof mirrorEnabled === "boolean") {
    prefs.mirrorEnabled = mirrorEnabled;
  }
  return prefs;
};

// merges a patch into the stored UI preferences: best effort, so storage
// failures never break the interaction that triggered the write
export const writePrefs = (storage: StorageLike | null, patch: Prefs): void => {
  if (!storage) return;
  try {
    const merged = { ...readStoredPrefs(storage), ...patch };
    storage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // storage full or blocked: best effort, keep going
  }
};

// saves the editor doc to storage: debounced on updates, flushed when the
// editor is destroyed, the page unloads, or the tab is hidden; returns a
// detach function (flushes any pending save) for React effect cleanup
export const createPersistence = (
  editor: PersistenceEditor,
  { storage, delay = 500 }: PersistenceOptions,
): (() => void) => {
  if (!storage) return () => {};

  let timer: ReturnType<typeof setTimeout> | undefined;

  const save = () => {
    try {
      storage.setItem(DOC_STORAGE_KEY, JSON.stringify(editor.getJSON()));
    } catch {
      // storage full or blocked: best effort, keep editing
    }
  };

  const flush = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    save();
  };

  const scheduleSave = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };

  const handleUnload = () => flush();
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") flush();
  };

  editor.on("update", scheduleSave);
  editor.on("destroy", flush);
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", handleUnload);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return () => {
    editor.off("update", scheduleSave);
    editor.off("destroy", flush);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", handleUnload);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    flush();
  };
};

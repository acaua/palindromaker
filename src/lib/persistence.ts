import type { JSONContent } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";

import { LANGUAGES } from "@/lib/dictionary";
import type { Language } from "@/lib/dictionary";
import { UI_LANGUAGES } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/i18n";

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

// the raw stored string, or null when storage is unavailable, the key is
// absent, or reading it fails
const readRaw = (storage: Pick<Storage, "getItem"> | null, key: string): string | null => {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

// reads and parses a stored value; undefined when there is nothing to read
// or the value is not JSON — callers fall back to their own defaults
const readJson = (storage: Pick<Storage, "getItem"> | null, key: string): unknown => {
  const raw = readRaw(storage, key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

interface Prefs {
  lang?: Language;
  uiLang?: UiLanguage;
  mirrorEnabled?: boolean;
  finderOpen?: boolean;
}

interface PersistenceEditor {
  getJSON: () => JSONContent;
  commands: {
    setContent: (content: JSONContent, options?: { emitUpdate?: boolean }) => boolean;
  };
  on: (event: "update" | "destroy", handler: () => void) => unknown;
  off: (event: "update" | "destroy", handler: () => void) => unknown;
}

// which version wins when two tabs have both moved on
export type ConflictChoice = "theirs" | "mine";

interface PersistenceOptions {
  storage: StorageLike | null;
  // validates documents written by other tabs, exactly like the initial load
  schema: Schema;
  delay?: number;
  // another tab saved a document this one cannot silently take: the app
  // asks the user and calls resolveConflict(). Fires once per conflict.
  onConflict?: () => void;
  // where storage events arrive; injectable like `storage` itself, so tests
  // can drive them without a browser
  storageEvents?: EventTarget | null;
}

export interface Persistence {
  // flushes any pending save and stops listening (React effect cleanup)
  detach: () => void;
  // answers the question raised by onConflict
  resolveConflict: (choice: ConflictChoice) => void;
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

// Saves the editor doc to storage: debounced on updates, flushed when the
// editor is destroyed, the page unloads, or the tab is hidden.
//
// The stored doc is shared by every tab on this origin, so saving blindly
// means the last tab to type wins and the other tab's work disappears with
// no warning. Two rules keep that from happening:
//
//   - a tab the user has not edited takes another tab's version silently:
//     there is nothing of theirs to lose, and a background tab left open
//     yesterday should not go on showing a stale palindrome;
//   - a tab the user *has* edited never overwrites a version it has not
//     seen. Storage events are the fast path; comparing what is in storage
//     against what we last wrote is the guarantee, since a frozen or
//     discarded background tab can miss events entirely.
export const createPersistence = (
  editor: PersistenceEditor,
  {
    storage,
    schema,
    delay = 500,
    onConflict,
    storageEvents = typeof window === "undefined" ? null : window,
  }: PersistenceOptions,
): Persistence => {
  if (!storage) return { detach: () => {}, resolveConflict: () => {} };

  let timer: ReturnType<typeof setTimeout> | undefined;
  // the exact stored string this tab is in sync with; anything else in
  // storage means another tab wrote while we were not looking
  let syncedWith = readRaw(storage, DOC_STORAGE_KEY);
  // has the user changed the document in *this* tab? stays true once they
  // have, since adopting another version would discard visible work
  let editedHere = false;
  let conflicted = false;

  const raiseConflict = () => {
    if (conflicted) return; // one question per unresolved conflict
    conflicted = true;
    onConflict?.();
  };

  const adopt = (doc: JSONContent) => {
    // emitUpdate: false — the content now matches storage, so this must not
    // look like a local edit and schedule a save of what we just read
    editor.commands.setContent(doc, { emitUpdate: false });
    syncedWith = readRaw(storage, DOC_STORAGE_KEY);
    editedHere = false;
    conflicted = false;
  };

  const save = () => {
    if (readRaw(storage, DOC_STORAGE_KEY) !== syncedWith) {
      raiseConflict();
      return;
    }
    const json = JSON.stringify(editor.getJSON());
    try {
      storage.setItem(DOC_STORAGE_KEY, json);
      syncedWith = json;
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
    editedHere = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };

  const handleStorage = (event: Event) => {
    if ((event as StorageEvent).key !== DOC_STORAGE_KEY) return;
    const incoming = readStoredDoc(storage, schema);
    // cleared, foreign or unrenderable: leave this tab alone
    if (!incoming) return;
    if (editedHere) {
      raiseConflict();
      return;
    }
    adopt(incoming);
  };

  const resolveConflict = (choice: ConflictChoice) => {
    conflicted = false;
    if (choice === "theirs") {
      const incoming = readStoredDoc(storage, schema);
      if (incoming) adopt(incoming);
      return;
    }
    // "mine": treat their version as the one we are knowingly replacing
    syncedWith = readRaw(storage, DOC_STORAGE_KEY);
    scheduleSave();
  };

  const handleUnload = () => flush();
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") flush();
  };

  editor.on("update", scheduleSave);
  editor.on("destroy", flush);
  storageEvents?.addEventListener("storage", handleStorage);
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", handleUnload);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return {
    detach: () => {
      editor.off("update", scheduleSave);
      editor.off("destroy", flush);
      storageEvents?.removeEventListener("storage", handleStorage);
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeunload", handleUnload);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      flush();
    },
    resolveConflict,
  };
};

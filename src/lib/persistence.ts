import type { JSONContent } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";

export const DOC_STORAGE_KEY = "palindromaker:doc:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface PersistenceEditor {
  getJSON: () => JSONContent;
  on: (event: "update" | "destroy", handler: () => void) => unknown;
  off: (event: "update" | "destroy", handler: () => void) => unknown;
}

export interface PersistenceOptions {
  storage: StorageLike | null;
  key?: string;
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
  key: string,
  schema?: Schema,
): JSONContent | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredDoc(parsed)) return null;
    if (schema) {
      // parseable JSON that the editor's schema cannot represent (unknown
      // node/mark types, broken structure) would crash nodeFromJSON during
      // render and take the whole app down on every reload; reject it here
      schema.nodeFromJSON(parsed).check();
    }
    return parsed;
  } catch {
    return null;
  }
};

// saves the editor doc to storage: debounced on updates, flushed when the
// editor is destroyed, the page unloads, or the tab is hidden; returns a
// detach function (flushes any pending save) for React effect cleanup
export const createPersistence = (
  editor: PersistenceEditor,
  { storage, key = DOC_STORAGE_KEY, delay = 500 }: PersistenceOptions,
): (() => void) => {
  if (!storage) return () => {};

  let timer: ReturnType<typeof setTimeout> | undefined;

  const save = () => {
    try {
      storage.setItem(key, JSON.stringify(editor.getJSON()));
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

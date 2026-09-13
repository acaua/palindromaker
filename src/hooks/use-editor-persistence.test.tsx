import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import type { JSONContent } from "@tiptap/core";
import { Schema } from "@tiptap/pm/model";

import { useEditorPersistence } from "@/hooks/use-editor-persistence";
import { DOC_STORAGE_KEY } from "@/lib/persistence";
import type { PersistenceEditor } from "@/lib/persistence";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: { group: "inline" },
  },
});

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

type Handler = () => void;

// the slice of the editor createPersistence touches, without TipTap
class StubEditor implements PersistenceEditor {
  doc: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
  applied: JSONContent[] = [];
  private listeners = new Map<string, Set<Handler>>();

  commands = {
    setContent: (content: JSONContent): boolean => {
      this.doc = content;
      this.applied.push(content);
      return true;
    },
  };

  on(event: string, handler: Handler): this {
    let handlers = this.listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }
    handlers.add(handler);
    return this;
  }

  off(event: string, handler: Handler): this {
    this.listeners.get(event)?.delete(handler);
    return this;
  }

  getJSON(): JSONContent {
    return this.doc;
  }

  emit(event: string): void {
    // copy so a handler mutating the listener set during emit cannot skip
    // ones already queued to fire
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const handler of [...(this.listeners.get(event) ?? [])]) handler();
  }
}

const otherDoc = (text: string): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const storageEvent = () => Object.assign(new Event("storage"), { key: DOC_STORAGE_KEY });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useEditorPersistence", () => {
  test("does nothing with a null editor", () => {
    const { result } = renderHook(() =>
      useEditorPersistence(null, { storage: new MemoryStorage(), schema }),
    );

    expect(result.current.conflict).toBe(false);
  });

  test("saves edits through the editor", () => {
    const storage = new MemoryStorage();
    const editor = new StubEditor();
    const { unmount } = renderHook(() => useEditorPersistence(editor, { storage, schema }));

    editor.emit("update");
    vi.advanceTimersByTime(500);

    expect(storage.getItem(DOC_STORAGE_KEY)).toBe(JSON.stringify(editor.doc));
    unmount();
  });

  test("stops listening when unmounted", () => {
    const storage = new MemoryStorage();
    const editor = new StubEditor();
    const { unmount } = renderHook(() => useEditorPersistence(editor, { storage, schema }));

    unmount();
    editor.emit("update");
    vi.advanceTimersByTime(500);

    expect(storage.getItem(DOC_STORAGE_KEY)).toBeNull();
  });

  test("raises a conflict and clears it when resolved", () => {
    const storage = new MemoryStorage();
    const editor = new StubEditor();
    const { result } = renderHook(() => useEditorPersistence(editor, { storage, schema }));

    // this tab edited, then another tab wrote
    editor.emit("update");
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(otherDoc("racecar")));
    act(() => {
      window.dispatchEvent(storageEvent());
    });

    expect(result.current.conflict).toBe(true);

    act(() => result.current.resolveConflict("theirs"));
    expect(result.current.conflict).toBe(false);
    expect(editor.applied).toEqual([otherDoc("racecar")]);
  });
});

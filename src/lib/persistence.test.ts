import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { Schema } from "@tiptap/pm/model";

import {
  createPersistence,
  DOC_STORAGE_KEY,
  localStorageOrNull,
  PREFS_STORAGE_KEY,
  readStoredDoc,
  readStoredPrefs,
  writePrefs,
} from "./persistence";

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

class FailingStorage {
  getItem(): string | null {
    return null;
  }

  setItem(): void {
    throw new Error("quota exceeded");
  }
}

type Handler = () => void;

class FakeEditor {
  doc: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
  private listeners = new Map<string, Set<Handler>>();

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
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      handler();
    }
  }
}

const stored = (storage: MemoryStorage) => storage.getItem(DOC_STORAGE_KEY);

class ThrowingStorage {
  getItem(): string | null {
    throw new Error("access denied");
  }

  setItem(): void {
    throw new Error("access denied");
  }
}

describe("readStoredDoc", () => {
  test("returns null when storage is unavailable", () => {
    expect(readStoredDoc(null, schema)).toBeNull();
  });

  test("returns null when the key is absent", () => {
    expect(readStoredDoc(new MemoryStorage(), schema)).toBeNull();
  });

  test("returns null when storage refuses to be read", () => {
    expect(readStoredDoc(new ThrowingStorage(), schema)).toBeNull();
  });

  test("returns the parsed doc", () => {
    const storage = new MemoryStorage();
    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(doc));

    expect(readStoredDoc(storage, schema)).toEqual(doc);
  });

  test("returns null for corrupt JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, "not json");

    expect(readStoredDoc(storage, schema)).toBeNull();
  });

  test("returns null for values that are not a doc", () => {
    const storage = new MemoryStorage();
    for (const value of ["null", '"hello"', "42", '{"type":"paragraph"}']) {
      storage.setItem(DOC_STORAGE_KEY, value);
      expect(readStoredDoc(storage, schema)).toBeNull();
    }
  });

  test("returns null for an empty content array", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, '{"type":"doc","content":[]}');

    expect(readStoredDoc(storage, schema)).toBeNull();
  });

  test("accepts schema-valid docs", () => {
    const storage = new MemoryStorage();
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "aba" }] },
      ],
    };
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(doc));

    expect(readStoredDoc(storage, schema)).toEqual(doc);
  });

  test("rejects docs the schema cannot represent", () => {
    const storage = new MemoryStorage();
    const invalid = [
      // shallow check would pass: type "doc" with non-empty content,
      // but the unknown node type crashes nodeFromJSON at render time
      '{"type":"doc","content":[{"type":"bogus"}]}',
      // structurally invalid: a text node directly in the doc
      '{"type":"doc","content":[{"type":"text","text":"hi"}]}',
    ];
    for (const value of invalid) {
      storage.setItem(DOC_STORAGE_KEY, value);
      expect(readStoredDoc(storage, schema)).toBeNull();
    }
  });
});

describe("localStorageOrNull", () => {
  const defineLocalStorage = (descriptor: PropertyDescriptor) =>
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      ...descriptor,
    });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  test("returns null when there is no localStorage", () => {
    expect(localStorageOrNull()).toBeNull();
  });

  test("returns null when the browser blocks site storage", () => {
    // Chrome and Safari throw on *access* when storage is blocked; without
    // this guard the exception escapes before the app renders
    defineLocalStorage({
      get() {
        throw new Error("SecurityError");
      },
    });

    expect(localStorageOrNull()).toBeNull();
  });

  test("returns the storage when it is available", () => {
    const storage = new MemoryStorage();
    defineLocalStorage({ value: storage });

    expect(localStorageOrNull()).toBe(storage);
  });
});

describe("createPersistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("saves the doc after the debounce delay", () => {
    const storage = new MemoryStorage();
    const editor = new FakeEditor();
    const detach = createPersistence(editor, { storage });

    editor.emit("update");
    expect(stored(storage)).toBeNull();

    vi.advanceTimersByTime(500);
    expect(stored(storage)).toBe(JSON.stringify(editor.doc));

    detach();
  });

  test("coalesces bursts of updates into one save", () => {
    const storage = new MemoryStorage();
    const editor = new FakeEditor();
    const detach = createPersistence(editor, { storage });

    editor.emit("update");
    vi.advanceTimersByTime(200);

    const changed: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "ab" }] }],
    };
    editor.doc = changed;
    editor.emit("update");

    vi.advanceTimersByTime(200);
    expect(stored(storage)).toBeNull();

    vi.advanceTimersByTime(300);
    expect(stored(storage)).toBe(JSON.stringify(changed));

    detach();
  });

  test("flushes a pending save when the editor is destroyed", () => {
    const storage = new MemoryStorage();
    const editor = new FakeEditor();
    createPersistence(editor, { storage });

    editor.emit("update");
    editor.emit("destroy");

    expect(stored(storage)).toBe(JSON.stringify(editor.doc));

    // no duplicate save once the debounce would have fired
    vi.advanceTimersByTime(1000);
    expect(stored(storage)).toBe(JSON.stringify(editor.doc));
  });

  test("detaching flushes and stops listening", () => {
    const storage = new MemoryStorage();
    const editor = new FakeEditor();
    const original = editor.doc;
    const detach = createPersistence(editor, { storage });

    editor.emit("update");
    detach();
    expect(stored(storage)).toBe(JSON.stringify(original));

    editor.doc = { type: "doc", content: [{ type: "paragraph" }] };
    editor.emit("update");
    vi.advanceTimersByTime(1000);
    expect(stored(storage)).toBe(JSON.stringify(original));
  });

  test("swallows storage failures", () => {
    const editor = new FakeEditor();
    const detach = createPersistence(editor, {
      storage: new FailingStorage(),
    });

    editor.emit("update");
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();

    detach();
  });

  test("does nothing when storage is unavailable", () => {
    const editor = new FakeEditor();
    const detach = createPersistence(editor, { storage: null });

    editor.emit("update");
    vi.advanceTimersByTime(1000);
    expect(() => detach()).not.toThrow();
  });
});

describe("readStoredPrefs", () => {
  test("returns nothing when storage is unavailable or key is absent", () => {
    expect(readStoredPrefs(null)).toEqual({});
    expect(readStoredPrefs(new MemoryStorage())).toEqual({});
  });

  test("returns the stored prefs", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ lang: "en", mirrorEnabled: true }),
    );

    expect(readStoredPrefs(storage)).toEqual({
      lang: "en",
      mirrorEnabled: true,
    });
  });

  test("drops unknown languages and mistyped values", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ lang: "xx", mirrorEnabled: "yes" }),
    );

    expect(readStoredPrefs(storage)).toEqual({});
  });

  test("returns nothing for corrupt JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(PREFS_STORAGE_KEY, "not json");

    expect(readStoredPrefs(storage)).toEqual({});
  });

  test("returns nothing when storage refuses to be read", () => {
    expect(readStoredPrefs(new ThrowingStorage())).toEqual({});
  });
});

describe("writePrefs", () => {
  test("merges the patch into the stored prefs", () => {
    const storage = new MemoryStorage();
    writePrefs(storage, { lang: "de" });
    writePrefs(storage, { mirrorEnabled: true });

    expect(readStoredPrefs(storage)).toEqual({
      lang: "de",
      mirrorEnabled: true,
    });
  });

  test("swallows storage failures", () => {
    const storage = new FailingStorage();

    expect(() => writePrefs(storage, { lang: "de" })).not.toThrow();
  });

  test("does nothing when storage is unavailable", () => {
    expect(() => writePrefs(null, { lang: "de" })).not.toThrow();
  });
});

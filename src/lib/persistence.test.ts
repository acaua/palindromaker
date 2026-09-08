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
  // records what persistence pushed back into the editor
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
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      handler();
    }
  }
}

const stored = (storage: MemoryStorage) => storage.getItem(DOC_STORAGE_KEY);

// a document the test schema can represent, as another tab would store it
const otherTabDoc = (text: string): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

// what a browser delivers to the *other* tabs after a write
const storageEvent = (key: string) =>
  Object.assign(new Event("storage"), { key });

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
    const { detach } = createPersistence(editor, { storage, schema });

    editor.emit("update");
    expect(stored(storage)).toBeNull();

    vi.advanceTimersByTime(500);
    expect(stored(storage)).toBe(JSON.stringify(editor.doc));

    detach();
  });

  test("coalesces bursts of updates into one save", () => {
    const storage = new MemoryStorage();
    const editor = new FakeEditor();
    const { detach } = createPersistence(editor, { storage, schema });

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
    createPersistence(editor, { storage, schema });

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
    const { detach } = createPersistence(editor, { storage, schema });

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
    const { detach } = createPersistence(editor, {
      storage: new FailingStorage(),
      schema,
    });

    editor.emit("update");
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();

    detach();
  });

  test("does nothing when storage is unavailable", () => {
    const editor = new FakeEditor();
    const { detach } = createPersistence(editor, { storage: null, schema });

    editor.emit("update");
    vi.advanceTimersByTime(1000);
    expect(() => detach()).not.toThrow();
  });
});

// another tab shares the same storage: it writes, and the browser tells
// this tab about it through a storage event
describe("createPersistence across tabs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    const storage = new MemoryStorage();
    const editor = new FakeEditor();
    const storageEvents = new EventTarget();
    const onConflict = vi.fn();
    const persistence = createPersistence(editor, {
      storage,
      schema,
      storageEvents,
      onConflict,
    });
    // what the other tab does: write, then the event arrives here
    const otherTabSaves = (text: string) => {
      storage.setItem(DOC_STORAGE_KEY, JSON.stringify(otherTabDoc(text)));
      storageEvents.dispatchEvent(storageEvent(DOC_STORAGE_KEY));
    };
    return {
      storage,
      editor,
      persistence,
      onConflict,
      storageEvents,
      otherTabSaves,
    };
  };

  test("a tab with no edits of its own takes the other version", () => {
    const { editor, onConflict, otherTabSaves } = setup();

    otherTabSaves("racecar");

    expect(editor.applied).toEqual([otherTabDoc("racecar")]);
    expect(onConflict).not.toHaveBeenCalled();
  });

  test("adopting does not look like a local edit", () => {
    const { storage, editor, otherTabSaves } = setup();

    otherTabSaves("racecar");
    vi.advanceTimersByTime(1000);

    // no save was scheduled, and a later external write is still adopted
    expect(stored(storage)).toBe(JSON.stringify(otherTabDoc("racecar")));
    otherTabSaves("rotator");
    expect(editor.applied).toHaveLength(2);
  });

  test("a tab that has been edited is asked instead", () => {
    const { editor, onConflict, otherTabSaves } = setup();

    editor.doc = otherTabDoc("level");
    editor.emit("update");
    otherTabSaves("racecar");

    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(editor.applied).toEqual([]);
  });

  test("the question is asked once per conflict", () => {
    const { editor, onConflict, otherTabSaves } = setup();

    editor.emit("update");
    otherTabSaves("racecar");
    otherTabSaves("rotator");
    vi.advanceTimersByTime(1000);

    expect(onConflict).toHaveBeenCalledTimes(1);
  });

  test("an unanswered conflict holds off saving", () => {
    const { storage, editor, otherTabSaves } = setup();

    editor.doc = otherTabDoc("level");
    editor.emit("update");
    otherTabSaves("racecar");
    vi.advanceTimersByTime(1000);

    // the other tab's version is still there: nothing was overwritten
    expect(stored(storage)).toBe(JSON.stringify(otherTabDoc("racecar")));
  });

  test('"theirs" loads the other version and resumes adopting', () => {
    const { storage, editor, persistence, otherTabSaves } = setup();

    editor.doc = otherTabDoc("level");
    editor.emit("update");
    otherTabSaves("racecar");
    persistence.resolveConflict("theirs");

    expect(editor.applied).toEqual([otherTabDoc("racecar")]);
    // the tab is in sync again, so the next external write is silent
    otherTabSaves("rotator");
    expect(editor.applied).toHaveLength(2);
    expect(stored(storage)).toBe(JSON.stringify(otherTabDoc("rotator")));
  });

  test('"mine" overwrites the other version', () => {
    const { storage, editor, persistence, otherTabSaves } = setup();

    editor.doc = otherTabDoc("level");
    editor.emit("update");
    otherTabSaves("racecar");
    persistence.resolveConflict("mine");
    vi.advanceTimersByTime(500);

    expect(editor.applied).toEqual([]);
    expect(stored(storage)).toBe(JSON.stringify(otherTabDoc("level")));
  });

  test("a save never overwrites a version this tab has not seen", () => {
    const { storage, editor, onConflict } = setup();

    // the other tab writes, but the event never arrives (a frozen or
    // discarded background tab misses them)
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(otherTabDoc("racecar")));
    editor.doc = otherTabDoc("level");
    editor.emit("update");
    vi.advanceTimersByTime(500);

    expect(stored(storage)).toBe(JSON.stringify(otherTabDoc("racecar")));
    expect(onConflict).toHaveBeenCalledTimes(1);
  });

  test("writes to other keys are ignored", () => {
    const { storage, editor, onConflict, storageEvents } = setup();

    // another tab changed the word finder language, not the document
    storage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ lang: "en" }));
    storageEvents.dispatchEvent(storageEvent(PREFS_STORAGE_KEY));

    expect(editor.applied).toEqual([]);
    expect(onConflict).not.toHaveBeenCalled();
  });

  test("a document the schema cannot represent is ignored", () => {
    const { storage, editor, onConflict, storageEvents } = setup();

    storage.setItem(
      DOC_STORAGE_KEY,
      '{"type":"doc","content":[{"type":"bogus"}]}',
    );
    storageEvents.dispatchEvent(storageEvent(DOC_STORAGE_KEY));

    // pushing it into the editor would crash the app, so this tab keeps
    // the document it has
    expect(editor.applied).toEqual([]);
    expect(onConflict).not.toHaveBeenCalled();
  });

  test("detaching stops listening for other tabs", () => {
    const { editor, persistence, otherTabSaves } = setup();

    persistence.detach();
    otherTabSaves("racecar");

    expect(editor.applied).toEqual([]);
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
      JSON.stringify({ lang: "en", mirrorEnabled: true, finderOpen: false }),
    );

    expect(readStoredPrefs(storage)).toEqual({
      lang: "en",
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
        mirrorEnabled: "yes",
        finderOpen: "open",
      }),
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
    writePrefs(storage, { finderOpen: false });

    expect(readStoredPrefs(storage)).toEqual({
      lang: "de",
      mirrorEnabled: true,
      finderOpen: false,
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

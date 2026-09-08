import { describe, expect, test } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { history, undo } from "@tiptap/pm/history";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { Slice } from "@tiptap/pm/model";
import { ReplaceStep } from "@tiptap/pm/transform";

import {
  createMirrorPlugin,
  mirrorPluginKey,
  wordInsertMode,
  wordInsertTransactionFor,
} from "./mirror-extension";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: { group: "inline" },
  },
});

const buildDoc = (text: string) =>
  schema.node(
    "doc",
    null,
    text
      .split("\n")
      .map((paragraph) =>
        schema.node(
          "paragraph",
          null,
          paragraph ? [schema.text(paragraph)] : [],
        ),
      ),
  );

const docText = (state: EditorState) =>
  state.doc.textBetween(0, state.doc.content.size, "\n", "\n");

const createState = (text: string, options?: { enabled: boolean }) =>
  EditorState.create({
    doc: buildDoc(text),
    plugins: [history(), createMirrorPlugin(options)],
  });

const enableMirror = (state: EditorState) =>
  state.apply(state.tr.setMeta(mirrorPluginKey, { enabled: true }));

const typeChar = (state: EditorState, pos: number, char: string) =>
  state.apply(state.tr.insertText(char, pos, pos));

const backspaceAt = (state: EditorState, pos: number) =>
  state.apply(state.tr.delete(pos - 1, pos));

const deleteForwardAt = (state: EditorState, pos: number) =>
  state.apply(state.tr.delete(pos, pos + 1));

// a word finder click: the caret sits where the user left it, and the
// command dispatches one transaction from there
const insertWord = (state: EditorState, pos: number, word: string) => {
  const placed = state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, pos)),
  );
  return placed.apply(wordInsertTransactionFor(placed, word));
};

describe("mirror editing disabled", () => {
  test("typing is not duplicated", () => {
    const state = typeChar(createState("aba"), 4, "c");

    expect(docText(state)).toBe("abac");
  });
});

describe("initial state", () => {
  test("the plugin can start enabled", () => {
    // how a toggle remembered from a previous session comes back, without
    // a toggle transaction after the editor mounts
    const state = typeChar(createState("aba", { enabled: true }), 4, "c");

    expect(docText(state)).toBe("cabac");
  });
});

describe("mirror typing", () => {
  const enabled = (text: string) => enableMirror(createState(text));

  test("typing at the end duplicates the char at the start", () => {
    const state = typeChar(enabled("aba"), 4, "c");

    expect(docText(state)).toBe("cabac");
  });

  test("typing at the start duplicates the char at the end", () => {
    const state = typeChar(enabled("aba"), 1, "c");

    expect(docText(state)).toBe("cabac");
  });

  test("typing in the middle duplicates around the center", () => {
    const state = typeChar(enabled("aba"), 3, "c");

    expect(docText(state)).toBe("acbca");
  });

  test("the first char in an empty document becomes the center", () => {
    const state = typeChar(enableMirror(createState("")), 1, "a");

    expect(docText(state)).toBe("a");
  });

  test("typing after a single char wraps around it", () => {
    const state = typeChar(enabled("a"), 2, "b");

    expect(docText(state)).toBe("bab");
  });

  test("a first non-letter char is left alone", () => {
    const state = typeChar(enableMirror(createState("")), 1, "!");

    expect(docText(state)).toBe("!");
  });

  test("non-letters are not mirrored", () => {
    const state = typeChar(enabled("aba"), 4, ",");

    expect(docText(state)).toBe("aba,");
  });

  test("case and accents are kept as typed", () => {
    const state = typeChar(enabled("AbBa"), 5, "Ç");

    expect(docText(state)).toBe("ÇAbBaÇ");
  });

  test("typing is not mirrored when the text is not a palindrome", () => {
    const state = typeChar(enabled("ab"), 3, "c");

    expect(docText(state)).toBe("abc");
  });

  test("works across paragraphs", () => {
    const state = typeChar(enabled("ab\nba"), 7, "c");

    expect(docText(state)).toBe("cab\nbac");
  });
});

describe("mirror deletion", () => {
  const enabled = (text: string) => enableMirror(createState(text));

  test("backspace removes the mirrored pair", () => {
    const state = backspaceAt(enabled("aba"), 4);

    expect(docText(state)).toBe("b");
  });

  test("backspace of the center letter only removes the center", () => {
    const state = backspaceAt(enabled("aba"), 3);

    expect(docText(state)).toBe("aa");
  });

  test("forward delete removes the mirrored pair", () => {
    const state = deleteForwardAt(enabled("aba"), 1);

    expect(docText(state)).toBe("b");
  });

  test("deleting a non-letter is not mirrored", () => {
    const state = backspaceAt(enabled("a,a"), 3);

    expect(docText(state)).toBe("aa");
  });

  test("deleting is not mirrored when the text is not a palindrome", () => {
    const state = backspaceAt(enabled("abc"), 4);

    expect(docText(state)).toBe("ab");
  });

  test("joining paragraphs is not mirrored", () => {
    // a paragraph join is a ReplaceStep spanning the block boundary
    const state = enabled("ab\nba");
    const joined = state.apply(
      state.tr.step(new ReplaceStep(3, 5, Slice.empty, true)),
    );

    expect(docText(joined)).toBe("abba");
  });
});

describe("inserting a word", () => {
  const enabled = (text: string) => enableMirror(createState(text));

  test("the word is inserted with its mirror opposite", () => {
    const state = insertWord(enabled("aba"), 4, "cd");

    expect(docText(state)).toBe("dc aba cd");
  });

  test("the word is inserted alone while the toggle is off", () => {
    const state = insertWord(createState("aba"), 4, "cd");

    expect(docText(state)).toBe("aba cd");
  });

  test("the word is inserted alone when the text is not a palindrome", () => {
    const state = insertWord(enabled("abc"), 4, "cd");

    expect(docText(state)).toBe("abc cd");
  });

  test("a one-letter word is not mirrored twice", () => {
    // the insertion is a single-character step, which mirror typing would
    // duplicate if the transaction were not marked as the plugin's own
    const state = insertWord(enabled("a,,a"), 3, "a");

    expect(docText(state)).toBe("a,a,a");
  });
});

describe("word insert mode", () => {
  test("reports what a word finder click will do", () => {
    expect(wordInsertMode(createState("aba"))).toBe("caret");
    expect(wordInsertMode(enableMirror(createState("aba")))).toBe("mirrored");
    expect(wordInsertMode(enableMirror(createState("abc")))).toBe("paused");
  });
});

describe("history", () => {
  test("a mirrored keystroke undoes in a single step", () => {
    let state = typeChar(enableMirror(createState("aba")), 4, "c");
    expect(docText(state)).toBe("cabac");

    let undone: EditorState | undefined;
    undo(state, (tr) => {
      undone = state.apply(tr);
    });
    state = undone as EditorState;

    expect(docText(state)).toBe("aba");
  });

  test("an inserted word undoes in a single step", () => {
    let state = insertWord(enableMirror(createState("aba")), 4, "cd");
    expect(docText(state)).toBe("dc aba cd");

    let undone: EditorState | undefined;
    undo(state, (tr) => {
      undone = state.apply(tr);
    });
    state = undone as EditorState;

    expect(docText(state)).toBe("aba");
  });

  test("a mirrored deletion undoes in a single step", () => {
    let state = backspaceAt(enableMirror(createState("aba")), 4);
    expect(docText(state)).toBe("b");

    let undone: EditorState | undefined;
    undo(state, (tr) => {
      undone = state.apply(tr);
    });
    state = undone as EditorState;

    expect(docText(state)).toBe("aba");
  });
});

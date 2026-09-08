import { describe, expect, test } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";

import { analyzeDoc } from "./doc-analysis";
import { wordInsertTransaction } from "./word-insert";
import type { WordInsertMode } from "./word-insert";

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

// the document with the caret at doc position `caret`, then the word
// inserted: the text with "|" marking where the caret ended up, so both
// halves and the caret between them are checked in one assertion
const insert = (
  text: string,
  caret: number,
  word: string,
  mode: WordInsertMode = "mirrored",
): { text: string; isPalindrome: boolean } => {
  const doc = buildDoc(text);
  const state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, caret),
  });

  const next = state.apply(wordInsertTransaction(state, word, mode));
  const inserted = next.doc.textBetween(0, next.doc.content.size, "\n", "\n");
  // textBetween drops the block tokens the caret position counts
  const caretIndex = next.selection.from - 1;

  return {
    text: `${inserted.slice(0, caretIndex)}|${inserted.slice(caretIndex)}`,
    isPalindrome: analyzeDoc(next.doc).result.isPalindrome,
  };
};

describe("inserting a word with mirroring", () => {
  test("the word goes in at the caret and its mirror opposite", () => {
    expect(insert("ovo", 1, "amor").text).toBe("amor| ovo roma");
    expect(insert("ovo", 4, "amor").text).toBe("roma ovo amor|");
    expect(insert("abba", 3, "amor").text).toBe("ab amor| roma ba");
  });

  test("the caret lands between the word and its mirror", () => {
    // where typing the word would have left it: the next word goes on
    // building the palindrome inwards
    const { text } = insert("amor ovo roma", 6, "casa");

    expect(text).toBe("amor casa| ovo asac roma");
  });

  test("an empty document takes the word and its mirror side by side", () => {
    expect(insert("", 1, "amor").text).toBe("amor| roma");
  });

  test("a word that reads the same both ways is its own mirror at the center", () => {
    // the caret is the center in letter space, so one copy keeps the text
    // a palindrome; anywhere else the word still needs its mirror
    expect(insert("", 1, "ovo").text).toBe("ovo|");
    expect(insert("abba", 3, "ovo").text).toBe("ab ovo| ba");
    expect(insert("amor ovo roma", 6, "arara").text).toBe(
      "amor arara| ovo arara roma",
    );
  });

  test("a one-letter word at the center goes in once", () => {
    // a single letter is also a single-character insert, which the mirror
    // plugin would duplicate if the transaction were not marked as its own
    expect(insert("a,,a", 3, "a").text).toBe("a,a|,a");
  });

  test("the text still reads the same both ways", () => {
    const cases: Array<[string, number, string]> = [
      ["", 1, "amor"],
      ["", 1, "ovo"],
      ["", 1, "a"],
      ["ovo", 1, "amor"],
      ["ovo", 2, "amor"],
      ["ovo", 3, "amor"],
      ["ovo", 4, "amor"],
      ["abba", 1, "amor"],
      ["abba", 3, "amor"],
      ["abba", 3, "ovo"],
      ["a, a", 3, "amor"],
      ["ab\nba", 3, "amor"],
      ["socorram-me subi no onibus em marrocos", 12, "amor"],
    ];

    for (const [text, caret, word] of cases) {
      const result = insert(text, caret, word);
      expect(result.isPalindrome, `${text} @${caret} + ${word}`).toBe(true);
    }
  });

  test("works across paragraphs", () => {
    expect(insert("ab\nba", 3, "amor").text).toBe("ab amor| roma\nba");
  });
});

describe("spacing", () => {
  test("a space keeps the word from fusing with a neighbouring letter", () => {
    expect(insert("ovo", 2, "casa", "caret").text).toBe("o casa| vo");
  });

  test("no space is added where the neighbour is not a letter", () => {
    expect(insert("a, a", 3, "casa", "caret").text).toBe("a,casa| a");
  });

  test("the ends of a block need no space", () => {
    expect(insert("", 1, "casa", "caret").text).toBe("casa|");
    expect(insert("ab\nba", 3, "casa", "caret").text).toBe("ab casa|\nba");
  });
});

describe("inserting a word without mirroring", () => {
  test("the word goes in at the caret alone", () => {
    expect(insert("ovo", 1, "amor", "caret").text).toBe("amor| ovo");
    expect(insert("ovo", 4, "amor", "caret").text).toBe("ovo amor|");
  });

  test("a paused mirror inserts at the caret too", () => {
    // mirroring a text that already reads differently both ways cannot
    // repair it, so the word goes in where it was asked for
    expect(insert("hello", 6, "amor", "paused").text).toBe("hello amor|");
  });

  test("nothing is deleted when text is selected", () => {
    const doc = buildDoc("ovo");
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 1, 4),
    });

    const next = state.apply(wordInsertTransaction(state, "amor", "caret"));

    expect(next.doc.textBetween(0, next.doc.content.size)).toBe("amor ovo");
  });
});

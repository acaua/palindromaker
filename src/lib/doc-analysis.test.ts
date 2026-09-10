import { describe, expect, test } from "vite-plus/test";
import { Schema } from "@tiptap/pm/model";

import { analyzeDoc } from "./doc-analysis";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    blockquote: { group: "block", content: "block+" },
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
        schema.node("paragraph", null, paragraph ? [schema.text(paragraph)] : []),
      ),
  );

describe("text and positions", () => {
  test("maps each character to its doc position", () => {
    const { text, positions } = analyzeDoc(buildDoc("aé"));

    expect(text).toBe("ae");
    expect(positions).toEqual([1, 2]);
  });

  test("separates paragraphs with unmapped newlines", () => {
    const { text, positions } = analyzeDoc(buildDoc("ab\nba"));

    expect(text).toBe("ab\nba");
    expect(positions).toEqual([1, 2, undefined, 5, 6]);
  });

  test("drops characters the normalizer removes", () => {
    // "e" + combining acute + "a": the mark has no doc position of its own
    const { text, positions } = analyzeDoc(buildDoc("e\u0301a"));

    expect(text).toBe("ea");
    expect(positions).toEqual([1, 3]);
  });

  test("keeps positions aligned when a mark opens the text", () => {
    // decomposed "éabae" normalizes to the palindrome "eabae"; without
    // alignment the center would land on the combining mark at doc
    // position 2 instead of the "b" at 4
    const { text, positions } = analyzeDoc(buildDoc("e\u0301abae"));

    expect(text).toBe("eabae");
    expect(positions).toEqual([1, 3, 4, 5, 6]);
  });

  test("only text blocks separate content", () => {
    // a wrapping block must not add a separator of its own: "ab" and "ba"
    // are two paragraphs inside one blockquote
    const doc = schema.node("doc", null, [
      schema.node("blockquote", null, [
        schema.node("paragraph", null, [schema.text("ab")]),
        schema.node("paragraph", null, [schema.text("ba")]),
      ]),
    ]);

    expect(analyzeDoc(doc).text).toBe("ab\nba");
  });
});

describe("posToIndex", () => {
  test("maps doc positions back to text indexes", () => {
    const { posToIndex } = analyzeDoc(buildDoc("ab\nba"));

    expect([...posToIndex]).toEqual([
      [1, 0],
      [2, 1],
      [5, 3],
      [6, 4],
    ]);
  });
});

describe("letterPositions", () => {
  test("skips punctuation and separators", () => {
    expect(analyzeDoc(buildDoc("a, a!")).letterPositions).toEqual([1, 4]);
    expect(analyzeDoc(buildDoc("ab\nba")).letterPositions).toEqual([1, 2, 5, 6]);
  });

  test("an empty document has no letters", () => {
    expect(analyzeDoc(buildDoc("")).letterPositions).toEqual([]);
  });
});

describe("result", () => {
  test("checks the normalized text", () => {
    expect(analyzeDoc(buildDoc("A b, b a")).result.isPalindrome).toBe(true);
    expect(analyzeDoc(buildDoc("hello world")).result.gap).toEqual([0, 10]);
  });
});

describe("memoization", () => {
  test("analyzing the same document twice reuses the analysis", () => {
    // documents are immutable, so both plugins analyzing the same
    // keystroke share a single pass
    const doc = buildDoc("aba");

    expect(analyzeDoc(doc)).toBe(analyzeDoc(doc));
  });

  test("a different document gets its own analysis", () => {
    expect(analyzeDoc(buildDoc("aba"))).not.toBe(analyzeDoc(buildDoc("abc")));
  });
});

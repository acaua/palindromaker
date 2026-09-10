import { getSchema } from "@tiptap/core";
import { describe, expect, test } from "vite-plus/test";

import { extensions, readerExtensions, schema } from "@/lib/editor-schema";
import { Palindrome } from "@/lib/palindrome-extension";
import { textToDoc } from "@/lib/share-link";

const readerSchema = getSchema(readerExtensions());

describe("editor schema", () => {
  test("the restricted schema is doc > paragraph > text, with no marks", () => {
    // sorted: node registry key order is an implementation detail
    expect(Object.keys(schema.nodes).sort()).toEqual(["doc", "paragraph", "text"]);
    expect(Object.keys(schema.marks)).toEqual([]);
  });

  test("the reader's extension set speaks the same schema as the editor's", () => {
    // `readerExtensions()` adds `ReadOnlyContent` and drops MirrorEditing;
    // if a schema-bearing extension ever joins the editor side alone, this
    // must fail, because one surface would then accept text the other
    // cannot show
    expect(Object.keys(readerSchema.nodes).sort()).toEqual(Object.keys(schema.nodes).sort());
    expect(Object.keys(readerSchema.marks).sort()).toEqual(Object.keys(schema.marks).sort());
  });

  test("shared text is schema-valid", () => {
    // the promise behind the share format (src/lib/share-link.ts): the
    // reader can render whatever a share fragment round-trips without
    // validating against the schema first
    schema.nodeFromJSON(textToDoc("Olá\n\nmundo")).check();
  });

  test("the editor's extension list is StarterKit + the two custom extensions", () => {
    const list = extensions({ enabled: true });
    expect(list).toHaveLength(3);
    expect(list[1]).toBe(Palindrome);
  });
});

import { describe, expect, test } from "vite-plus/test";

import { extensions, schema } from "@/lib/editor-schema";
import { Palindrome } from "@/lib/palindrome-extension";
import { textToDoc } from "@/lib/share-link";

describe("editor schema", () => {
  test("the restricted schema is doc > paragraph > text, with no marks", () => {
    // sorted: node registry key order is an implementation detail
    expect(Object.keys(schema.nodes).sort()).toEqual(["doc", "paragraph", "text"]);
    expect(Object.keys(schema.marks)).toEqual([]);
  });

  test("shared text is schema-valid", () => {
    // the promise behind the share format (src/lib/share-link.ts): the
    // editor can render whatever a share fragment round-trips without
    // validating against the schema first
    schema.nodeFromJSON(textToDoc("Olá\n\nmundo")).check();
  });

  test("the editor's extension list is StarterKit + the two custom extensions", () => {
    const list = extensions({ enabled: true });
    expect(list).toHaveLength(3);
    expect(list[1]).toBe(Palindrome);
  });
});

import { describe, expect, test } from "vite-plus/test";

import { MAX_SHARE_TEXT, buildShareUrl, readShareText, textToDoc } from "@/lib/share-link";

describe("buildShareUrl", () => {
  test("encodes the text into /p#t=", () => {
    expect(buildShareUrl("Anita lava la tina", "https://palindromaker.app")).toBe(
      "https://palindromaker.app/p#t=Anita%20lava%20la%20tina",
    );
  });

  test("escapes fragment-unsafe characters", () => {
    expect(buildShareUrl("a#b?c&d", "https://x.test")).toBe("https://x.test/p#t=a%23b%3Fc%26d");
  });

  test("encodes accents and multi-paragraph newlines", () => {
    expect(buildShareUrl("Élu par cette crapule", "https://x.test")).toBe(
      "https://x.test/p#t=%C3%89lu%20par%20cette%20crapule",
    );
    expect(buildShareUrl("ab\nba", "https://x.test")).toBe("https://x.test/p#t=ab%0Aba");
  });
});

describe("readShareText", () => {
  test("round-trips buildShareUrl", () => {
    const url = buildShareUrl("A grama é amarga", "https://x.test");
    expect(readShareText(url.slice(url.indexOf("#")))).toBe("A grama é amarga");
  });

  test("accepts the fragment with and without the leading #", () => {
    expect(readShareText("t=ab%20ba")).toBe("ab ba");
    expect(readShareText("#t=ab%20ba")).toBe("ab ba");
  });

  test("returns the empty string for a present-but-empty param", () => {
    expect(readShareText("#t=")).toBe("");
  });

  test("rejects foreign or mangled fragments", () => {
    expect(readShareText("")).toBeNull();
    expect(readShareText("#")).toBeNull();
    expect(readShareText("#lang=pt")).toBeNull();
    expect(readShareText("#tt=ab")).toBeNull();
    // a raw & means the fragment grew parameters; the builder only ever
    // emits an already-encoded literal &, so this is a foreign link
    expect(readShareText("#t=abc&lang=pt")).toBeNull();
  });

  test("accepts ampersands that are part of the text", () => {
    expect(readShareText("#t=ab%26cd")).toBe("ab&cd");
  });

  test("rejects malformed percent-encoding", () => {
    expect(readShareText("#t=%80")).toBeNull();
  });

  test("caps the decoded length", () => {
    expect(readShareText(`#t=${"a".repeat(MAX_SHARE_TEXT)}`)).toBe("a".repeat(MAX_SHARE_TEXT));
    expect(readShareText(`#t=${"a".repeat(MAX_SHARE_TEXT + 1)}`)).toBeNull();
  });

  test("reads window.location.hash when no fragment is given", () => {
    // node project: no window, so the guarded default finds nothing
    expect(readShareText()).toBeNull();
  });
});

describe("textToDoc", () => {
  test("splits paragraphs on newlines", () => {
    expect(textToDoc("ab\nba")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "ab" }] },
        { type: "paragraph", content: [{ type: "text", text: "ba" }] },
      ],
    });
  });

  test("keeps empty lines as empty paragraphs", () => {
    expect(textToDoc("a\n\nb")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "a" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "b" }] },
      ],
    });
  });
});

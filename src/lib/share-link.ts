import type { JSONContent } from "@tiptap/core";

import { readFragmentParam } from "@/lib/url-fragment";

// shared links carry the text in the URL fragment: /p#t=<percent-encoded
// text>. No backend, no KV — the fragment IS the payload, and plain
// percent-encoding keeps the URL legible (base64url was compared and
// rejected: size is a wash, legible URLs win).
export const MAX_SHARE_TEXT = 2000;

// the fragment payload for a text link: "t=<percent-encoded text>", kept
// symmetric with postHash in bluesky-post.ts so a surface can build the
// same fragment readShareText parses
export const textHash = (text: string): string => `t=${encodeURIComponent(text)}`;

export const buildShareUrl = (text: string, origin: string): string =>
  `${origin}/p#${textHash(text)}`;

// reads the text out of a #t=... fragment, with or without the leading
// "#": window.location.hash has it, TanStack's hash option does not.
// Returns null for anything that is not a well-formed t= fragment (no
// param, malformed percent-encoding) or that decodes past
// MAX_SHARE_TEXT; the empty string means the param is present but empty.
// Callers treat every falsy value as "no share".
export const readShareText = (fragment?: string): string | null => {
  const decoded = readFragmentParam("t", fragment);
  if (decoded === null || decoded.length > MAX_SHARE_TEXT) return null;
  return decoded;
};

// the decoded text as editor content. This must be JSON, not a string:
// TipTap parses string content as HTML, where "\n" is plain whitespace,
// while a text node keeps it. Every paragraph here is schema-valid, so
// the shared text needs no validation against the schema (unlike
// persistence.ts's stored docs, which other tabs may have written).
// Empty lines become empty paragraphs; they contribute nothing to the
// checker and vanish from getText, which is the round-trip loss the
// share format accepts.
const paragraph = (line: string): JSONContent =>
  line === ""
    ? { type: "paragraph" }
    : { type: "paragraph", content: [{ type: "text", text: line }] };

export const textToDoc = (text: string): JSONContent => ({
  type: "doc",
  content: text.split("\n").map(paragraph),
});

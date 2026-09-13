import { readFragmentParam } from "@/lib/url-fragment";

// Bluesky post references: a shared link can point at a post instead of
// carrying the palindrome text. Like share-link.ts this stays in the URL
// fragment (#b=<at-uri>), so the host never sees it and there is still no
// backend — the reader fetches the post from Bluesky's public API.
export const BSKY_APP = "https://bsky.app";
export const BSKY_EMBED = "https://embed.bsky.app";
export const BSKY_API = "https://api.bsky.app/xrpc";

// a parsed reference, before the handle (if any) is resolved to a DID
export type PostRef =
  | { kind: "uri"; uri: string }
  | { kind: "handle"; handle: string; rkey: string };

const POST_RECORD = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#\s]+)$/;
const POST_URL = /^(?:https?:\/\/)?(?:www\.)?bsky\.app\/profile\/([^/?#\s]+)\/post\/([^/?#\s]+)/;

// the one reader of a post's at-uri; every other consumer (the page link,
// the embed path, input parsing) goes through this rather than splitting
// the string themselves
export const parseAtUri = (uri: string): { did: string; rkey: string } | null => {
  const match = POST_RECORD.exec(uri);
  return match ? { did: match[1], rkey: match[2] } : null;
};

export const atUriFor = (did: string, rkey: string): string =>
  `at://${did}/app.bsky.feed.post/${rkey}`;

// accepts an at-uri or a bsky.app post URL (with or without the scheme);
// a DID in the profile path needs no resolution, a handle does
export const parsePostInput = (input: string): PostRef | null => {
  const value = input.trim();
  if (parseAtUri(value)) return { kind: "uri", uri: value };
  const match = POST_URL.exec(value);
  if (!match) return null;
  const [, actor, rkey] = match;
  return actor.startsWith("did:")
    ? { kind: "uri", uri: atUriFor(actor, rkey) }
    : { kind: "handle", handle: actor, rkey };
};

// the fragment payload for a post link: "/p#b=<at-uri>". Kept symmetric
// with share-link.ts's #t=.
export const postHash = (uri: string): string => `b=${encodeURIComponent(uri)}`;

export const readPostRef = (fragment?: string): PostRef | null => {
  const decoded = readFragmentParam("b", fragment);
  return decoded === null ? null : parsePostInput(decoded);
};

// the official embed iframe, matching embed.js exactly: the record path,
// an id the iframe posts back with its height, and — as the script does —
// a ref_url that is encoded once into the param value
export const embedIframeSrc = (uri: string, id: string, refUrl: string): string => {
  const parts = parseAtUri(uri);
  const path = parts ? `${parts.did}/app.bsky.feed.post/${parts.rkey}` : uri.slice("at://".length);
  const params = new URLSearchParams({ id });
  params.set("ref_url", encodeURIComponent(refUrl));
  return `${BSKY_EMBED}/embed/${path}?${params.toString()}`;
};

// a link back to the post as the app shows it; the author handle is
// preferred when we have it (from getPosts), the DID works as a fallback
export const postPageUrl = (uri: string, actor?: string): string | null => {
  const parts = parseAtUri(uri);
  if (!parts) return null;
  return `${BSKY_APP}/profile/${actor ?? parts.did}/post/${parts.rkey}`;
};

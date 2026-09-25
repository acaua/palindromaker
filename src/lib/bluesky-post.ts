import { isDidAccount, isHandleAccount, normalizeAccount } from "@/lib/bluesky-account";
import { readFragmentParam } from "@/lib/url-fragment";

export const BSKY_APP = "https://bsky.app";
export const BSKY_EMBED = "https://embed.bsky.app";
export const BSKY_API = "https://api.bsky.app/xrpc";

export type PostRef =
  | { kind: "uri"; uri: string }
  | { kind: "handle"; handle: string; rkey: string };

export type PostUriParts = { authority: string; rkey: string };

const POST_RECORD = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#\s]+)$/;
const POST_URL = /^(?:https?:\/\/)?(?:www\.)?bsky\.app\/profile\/([^/?#\s]+)\/post\/([^/?#\s]+)/;

export const parseAtUri = (uri: string): PostUriParts | null => {
  const match = POST_RECORD.exec(uri);
  return match ? { authority: match[1], rkey: match[2] } : null;
};

export const atUriFor = (did: string, rkey: string): string =>
  `at://${did}/app.bsky.feed.post/${rkey}`;

export const parsePostInput = (input: string): PostRef | null => {
  const value = input.trim();
  const uri = parseAtUri(value);
  if (uri) {
    if (isDidAccount(uri.authority)) return { kind: "uri", uri: atUriFor(uri.authority, uri.rkey) };
    if (isHandleAccount(uri.authority)) {
      return { kind: "handle", handle: uri.authority.toLowerCase(), rkey: uri.rkey };
    }
    return null;
  }
  const match = POST_URL.exec(value);
  if (!match) return null;
  const actor = normalizeAccount(match[1]);
  if (!actor) return null;
  return isDidAccount(actor)
    ? { kind: "uri", uri: atUriFor(actor, match[2]) }
    : { kind: "handle", handle: actor, rkey: match[2] };
};

export const postHash = (uri: string): string => `b=${encodeURIComponent(uri)}`;

export const readPostRef = (fragment?: string): PostRef | null => {
  const decoded = readFragmentParam("b", fragment);
  return decoded === null ? null : parsePostInput(decoded);
};

export const embedIframeSrc = (uri: string, id: string, refUrl: string): string => {
  const parts = parseAtUri(uri);
  const path = parts
    ? `${parts.authority}/app.bsky.feed.post/${parts.rkey}`
    : uri.slice("at://".length);
  const params = new URLSearchParams({ id });
  params.set("ref_url", encodeURIComponent(refUrl));
  return `${BSKY_EMBED}/embed/${path}?${params.toString()}`;
};

export const postPageUrl = (uri: string, actor?: string): string | null => {
  const parts = parseAtUri(uri);
  if (!parts) return null;
  return `${BSKY_APP}/profile/${actor ?? parts.authority}/post/${parts.rkey}`;
};

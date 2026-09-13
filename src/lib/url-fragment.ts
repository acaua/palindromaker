// The one reader for the URL-fragment parameters this app shares with:
// share-link.ts (#t=<percent-encoded text>) and bluesky-post.ts
// (#b=<at-uri>). Deliberately not URLSearchParams, which decodes "+" as a
// space while encodeURIComponent never produces one. A raw "&" anywhere
// means the fragment grew parameters, so it is foreign: null. Returns the
// decoded value, "" for a present-but-empty param, and null for anything
// malformed.
export const readFragmentParam = (name: string, fragment?: string): string | null => {
  const raw = fragment ?? (typeof window === "undefined" ? "" : window.location.hash);
  if (raw.includes("&")) return null;
  // name is a fixed literal from our own callers (t, b), not user input
  const match = new RegExp(`^#?${name}=([\\s\\S]*)$`).exec(raw);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

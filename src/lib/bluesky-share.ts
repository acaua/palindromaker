import { buildShareUrl } from "@/lib/share-link";

// Sharing a finished palindrome to Bluesky opens Bluesky's own composer
// prefilled — no auth, no API, and nothing leaves the page until the user
// clicks. The link-out is capped at Bluesky's 300-grapheme post limit.
export const BLUESKY_POST_LIMIT = 300;
const BLUESKY_COMPOSE = "https://bsky.app/intent/compose";

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

// Graphemes, the unit Bluesky counts; code points when Segmenter is absent.
export const graphemeCount = (text: string): number => {
  if (!segmenter) return Array.from(text).length;
  let count = 0;
  const segments = segmenter.segment(text)[Symbol.iterator]();
  while (!segments.next().done) count += 1;
  return count;
};

export const blueskyComposeUrl = (text: string): string =>
  `${BLUESKY_COMPOSE}?text=${encodeURIComponent(text)}`;

export interface BlueskyPostShare {
  text: string;
  composeUrl: string;
}

// Prefer the full /p#t= share link, then the site root, then the text
// alone; null when even the text alone exceeds the limit. Never truncates:
// a cut palindrome is no longer the thing being shared.
export const planBlueskyPost = (
  text: string,
  shareUrl: string,
  siteUrl: string,
): BlueskyPostShare | null => {
  if (text.trim() === "") return null;
  for (const body of [`${text}\n\n${shareUrl}`, `${text}\n\n${siteUrl}`, text]) {
    if (graphemeCount(body) <= BLUESKY_POST_LIMIT) {
      return { text: body, composeUrl: blueskyComposeUrl(body) };
    }
  }
  return null;
};

export const planBlueskyShare = (text: string, origin: string): BlueskyPostShare | null =>
  planBlueskyPost(text, buildShareUrl(text, origin), `${origin}/`);

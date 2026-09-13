import { BSKY_API, atUriFor } from "@/lib/bluesky-post";
import type { PostRef } from "@/lib/bluesky-post";
import type { FacetRange } from "@/lib/annotated-text";

// The slice of a Bluesky post view the app actually uses. The API returns
// a lot more; mapping once (and validating) keeps the rest of the app type
// safe against an external, untyped payload.
export interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  text: string;
  facetRanges: readonly FacetRange[];
  tags: readonly string[];
  labels: readonly string[];
  author: BlueskyAuthor;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
}

export type SearchSort = "top" | "latest";

// A failure reason the UI must tell apart: "notFound" is a real answer
// (deleted post, unknown handle), "rateLimited" is a throttle to back off
// from, "badRequest" is our own malformed query (a bug), and "error" is
// the network or a server error.
export type ApiFailureReason = "notFound" | "rateLimited" | "badRequest" | "error";

export type ApiResult<T> = { ok: true; value: T } | ApiFailure;

export type ApiFailure = { ok: false; reason: ApiFailureReason };

// map a failure reason onto a caller's status vocabulary, with a fallback
// for reasons the caller treats the same way
export const failureStatus = <S extends string>(
  reason: ApiFailureReason,
  overrides: Partial<Record<ApiFailureReason, S>>,
  fallback: S,
): S => overrides[reason] ?? fallback;

// one owner for "what did this response status mean": 404 is a real
// not-found, 400 a malformed request, everything else a server/network
// failure. Callers map the reasons they do not care about onto their own
// status vocabulary through failureStatus.
const httpFailure = (response: Response): ApiFailure => {
  if (response.status === 404) return { ok: false, reason: "notFound" };
  if (response.status === 400) return { ok: false, reason: "badRequest" };
  return { ok: false, reason: "error" };
};

// search adds the throttle to that vocabulary: 403/429 is a back-off, and
// only a 400 is a malformed request there (401/404/422/... are errors).
// The throttle rule lives here, next to httpFailure, and nowhere else.
const searchFailure = (response: Response): ApiFailure => {
  if (response.status === 403 || response.status === 429)
    return { ok: false, reason: "rateLimited" };
  if (response.status === 400) return { ok: false, reason: "badRequest" };
  return { ok: false, reason: "error" };
};

export const SEARCH_LIMIT = 100;

type Json = Record<string, unknown>;

const asRecord = (value: unknown): Json | null =>
  typeof value === "object" && value !== null ? (value as Json) : null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

const mapPost = (view: unknown): BlueskyPost | null => {
  const post = asRecord(view);
  const author = asRecord(post?.author);
  const rec = asRecord(post?.record);
  const uri = asString(post?.uri);
  const text = asString(rec?.text);
  if (!post || !author || !rec || !uri || text === undefined) return null;

  const facetRanges: FacetRange[] = [];
  const tags: string[] = [];
  if (Array.isArray(rec.facets)) {
    for (const facet of rec.facets) {
      const index = asRecord(asRecord(facet)?.index);
      const byteStart = index?.byteStart;
      const byteEnd = index?.byteEnd;
      if (typeof byteStart === "number" && typeof byteEnd === "number") {
        facetRanges.push({ byteStart, byteEnd });
      }
      const features = asRecord(facet)?.features;
      if (Array.isArray(features)) {
        for (const feature of features) {
          const tag = asString(asRecord(feature)?.tag);
          if (tag) tags.push(tag);
        }
      }
    }
  }

  const labels: string[] = [];
  if (Array.isArray(post.labels)) {
    for (const label of post.labels) {
      const value = asString(asRecord(label)?.val);
      if (value) labels.push(value);
    }
  }

  const did = asString(author.did) ?? "";
  return {
    uri,
    cid: asString(post.cid) ?? "",
    text,
    facetRanges,
    tags,
    labels,
    author: {
      did,
      handle: asString(author.handle) ?? did,
      displayName: asString(author.displayName),
    },
    createdAt: asString(rec.createdAt) ?? "",
    likeCount: asNumber(post.likeCount),
    repostCount: asNumber(post.repostCount),
    replyCount: asNumber(post.replyCount),
  };
};

// labels that mean the post should not be shown to logged-out viewers, or
// that it is adult/graphic; our hand-rendered cards apply this themselves
// (the official embed iframe enforces its own policy)
const RESTRICTED_LABELS = new Set([
  "porn",
  "sexual",
  "nudity",
  "graphic-media",
  "!no-unauthenticated",
]);

export const isRestrictedPost = (post: BlueskyPost): boolean =>
  post.labels.some((label) => RESTRICTED_LABELS.has(label));

// getPosts and searchPosts are both slow and throttled; an in-memory cache
// keeps a route revisit or a gallery card from spending another request.
// Only successful answers are remembered, so an explicit retry is never
// served a stale failure.
const postCache = new Map<string, BlueskyPost>();
const searchCache = new Map<string, { at: number; result: ApiResult<BlueskyPost[]> }>();
const SEARCH_TTL = 60_000;

export const clearBlueskyCache = (): void => {
  postCache.clear();
  searchCache.clear();
};

export const fetchPost = async (
  uri: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<BlueskyPost>> => {
  const cached = postCache.get(uri);
  if (cached) return { ok: true, value: cached };
  try {
    const response = await fetchImpl(
      `${BSKY_API}/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`,
    );
    if (!response.ok) return httpFailure(response);
    const body = asRecord(await response.json());
    const posts = Array.isArray(body?.posts) ? body.posts : [];
    const post = mapPost(posts[0]);
    if (!post) return { ok: false, reason: "notFound" };
    postCache.set(uri, post);
    return { ok: true, value: post };
  } catch {
    return { ok: false, reason: "error" };
  }
};

export const resolveHandle = async (
  handle: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<string>> => {
  try {
    const response = await fetchImpl(
      `${BSKY_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    );
    if (!response.ok) return httpFailure(response);
    const body = asRecord(await response.json());
    const did = asString(body?.did);
    return did ? { ok: true, value: did } : { ok: false, reason: "notFound" };
  } catch {
    return { ok: false, reason: "error" };
  }
};

// Turn a parsed post reference into an at-uri: an at-uri is its own answer,
// a handle needs a DID first. The post link form and the post reader both
// go through here rather than re-walking the branch.
export const resolvePostRef = async (
  ref: PostRef,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<string>> => {
  if (ref.kind === "uri") return { ok: true, value: ref.uri };
  const resolved = await resolveHandle(ref.handle, fetchImpl);
  return resolved.ok ? { ok: true, value: atUriFor(resolved.value, ref.rkey) } : resolved;
};

export const searchTaggedPosts = async (
  query: string,
  sort: SearchSort,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<BlueskyPost[]>> => {
  const key = `${sort}|${query}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < SEARCH_TTL) return cached.result;

  let result: ApiResult<BlueskyPost[]>;
  try {
    const response = await fetchImpl(
      `${BSKY_API}/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}&sort=${sort}`,
    );
    if (!response.ok) {
      result = searchFailure(response);
    } else {
      const body = asRecord(await response.json());
      const raw = Array.isArray(body?.posts) ? body.posts : [];
      const posts = raw.map(mapPost).filter((post): post is BlueskyPost => post !== null);
      for (const post of posts) postCache.set(post.uri, post);
      result = { ok: true, value: posts };
    }
  } catch {
    result = { ok: false, reason: "error" };
  }

  if (result.ok) searchCache.set(key, { at: Date.now(), result });
  return result;
};

// One request per query, merged. Bluesky's search has no boolean OR and is
// accent-sensitive, so distinct spellings (#palindromo / #palíndromo) must
// be asked for separately; the single-query cache keeps a revisit cheap.
// A partial throttle still returns what succeeded.
export const searchQueries = async (
  queries: readonly string[],
  sort: SearchSort,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<BlueskyPost[]>> => {
  const lists: BlueskyPost[][] = [];
  const reasons: ApiFailureReason[] = [];
  for (const query of queries) {
    const result = await searchTaggedPosts(query, sort, fetchImpl);
    if (result.ok) lists.push(result.value);
    else reasons.push(result.reason);
  }
  if (lists.length === 0) {
    const reason = reasons.includes("rateLimited")
      ? "rateLimited"
      : reasons.includes("badRequest")
        ? "badRequest"
        : "error";
    return { ok: false, reason };
  }

  // round-robin across queries so each tag contributes before the cap
  const seen = new Set<string>();
  const merged: BlueskyPost[] = [];
  const longest = Math.max(...lists.map((list) => list.length));
  for (let index = 0; index < longest && merged.length < SEARCH_LIMIT; index++) {
    for (const list of lists) {
      const post = list[index];
      if (!post || seen.has(post.uri)) continue;
      seen.add(post.uri);
      merged.push(post);
      if (merged.length >= SEARCH_LIMIT) break;
    }
  }
  return { ok: true, value: merged };
};

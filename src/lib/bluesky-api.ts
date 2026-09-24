import { BSKY_API, atUriFor, parseAtUri } from "@/lib/bluesky-post";
import type { FacetRange } from "@/lib/annotated-text";
import { isDidAccount, isHandleAccount } from "@/lib/bluesky-account";
import {
  activeLabels,
  authorLabelValues,
  MALFORMED_LABEL,
  recordLabelValues,
} from "@/lib/bluesky-labels";
import { sharedRequest } from "@/lib/shared-request";

export interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  accountLabels: readonly string[];
  profileLabels: readonly string[];
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  text: string;
  facetRanges: readonly FacetRange[];
  tags: readonly string[];
  labels: readonly string[];
  recordLabels: readonly string[];
  author: BlueskyAuthor;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
}

export interface BlueskyAuthorFeedPage {
  posts: readonly BlueskyPost[];
  cursor: string | null;
}

export type SearchSort = "top" | "latest";

export type ApiFailureReason = "notFound" | "rateLimited" | "badRequest" | "error";

export type ApiResult<T> = { ok: true; value: T } | ApiFailure;

export type ApiFailure = {
  ok: false;
  reason: ApiFailureReason;
  retryAt?: number;
};

export class BlueskyRequestError extends Error {
  constructor(
    public readonly reason: ApiFailureReason,
    public readonly retryAt?: number,
  ) {
    super(`Bluesky request failed: ${reason}`);
    this.name = "BlueskyRequestError";
  }
}

export const unwrapApiResult = <T>(result: ApiResult<T>): T => {
  if (!result.ok) throw new BlueskyRequestError(result.reason, result.retryAt);
  return result.value;
};

export const failureStatus = <S extends string>(
  reason: ApiFailureReason,
  overrides: Partial<Record<ApiFailureReason, S>>,
  fallback: S,
): S => overrides[reason] ?? fallback;

const malformedOrError = (response: Response): ApiFailure =>
  response.status === 400 ? { ok: false, reason: "badRequest" } : { ok: false, reason: "error" };

const httpFailure = (response: Response): ApiFailure =>
  response.status === 404 ? { ok: false, reason: "notFound" } : malformedOrError(response);

const resolveHandleFailure = (response: Response): ApiFailure =>
  response.status === 400 ? { ok: false, reason: "notFound" } : httpFailure(response);

const searchFailure = (response: Response): ApiFailure =>
  response.status === 403 || response.status === 429
    ? { ok: false, reason: "rateLimited" }
    : malformedOrError(response);

export const SEARCH_LIMIT = 100;

type Json = Record<string, unknown>;

const asRecord = (value: unknown): Json | null =>
  typeof value === "object" && value !== null ? (value as Json) : null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

const mapPost = (view: unknown, expected?: { did: string; rkey: string }): BlueskyPost | null => {
  const post = asRecord(view);
  const author = asRecord(post?.author);
  const rec = asRecord(post?.record);
  const rawUri = asString(post?.uri);
  const text = asString(rec?.text);
  const parsed = rawUri ? parseAtUri(rawUri) : null;
  const did = asString(author?.did);
  if (
    !post ||
    !author ||
    !rec ||
    !rawUri ||
    !parsed ||
    !did ||
    !isDidAccount(did) ||
    text === undefined
  ) {
    return null;
  }
  if (!isDidAccount(parsed.authority) && !isHandleAccount(parsed.authority)) return null;
  if (isDidAccount(parsed.authority) && parsed.authority !== did) return null;
  if (expected && (expected.did !== did || expected.rkey !== parsed.rkey)) return null;

  const uri = atUriFor(did, parsed.rkey);
  const facetRanges: FacetRange[] = [];
  const tags = new Set<string>();
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
          if (tag) tags.add(tag);
        }
      }
    }
  }

  const cid = asString(post.cid) ?? "";
  const authorLabels = authorLabelValues(author.labels, did);
  return {
    uri,
    cid,
    text,
    facetRanges,
    tags: [...tags],
    labels: activeLabels(post.labels, [rawUri, uri], cid),
    recordLabels: recordLabelValues(rec.labels),
    author: {
      did,
      handle: asString(author.handle) ?? did,
      displayName: asString(author.displayName),
      accountLabels: authorLabels.accountLabels,
      profileLabels: authorLabels.profileLabels,
    },
    createdAt: asString(rec.createdAt) ?? "",
    likeCount: asNumber(post.likeCount),
    repostCount: asNumber(post.repostCount),
    replyCount: asNumber(post.replyCount),
  };
};

const LEGACY_HASHTAG_LABELS = new Set([
  "porn",
  "sexual",
  "nudity",
  "graphic-media",
  "!no-unauthenticated",
]);
const RESTRICTED_LABELS = new Set([...LEGACY_HASHTAG_LABELS, "!hide", MALFORMED_LABEL]);
const ACCESS_LABELS = new Set(["!hide", "!no-unauthenticated", MALFORMED_LABEL]);

export type ModerationMode = "loggedOut" | "accountExplore" | "hashtagExplore";

export const isRestrictedPost = (
  post: BlueskyPost,
  mode: ModerationMode = "loggedOut",
): boolean => {
  if (mode === "hashtagExplore") {
    return post.labels.some((label) => LEGACY_HASHTAG_LABELS.has(label));
  }
  const labels = [...post.labels, ...post.recordLabels];
  if (mode === "loggedOut") {
    labels.push(...post.author.accountLabels);
    labels.push(
      ...post.author.profileLabels.filter(
        (label) => label === "!no-unauthenticated" || label === MALFORMED_LABEL,
      ),
    );
  } else {
    labels.push(...post.author.accountLabels.filter((label) => ACCESS_LABELS.has(label)));
    labels.push(
      ...post.author.profileLabels.filter(
        (label) => label === "!no-unauthenticated" || label === MALFORMED_LABEL,
      ),
    );
  }
  return labels.some((label) => RESTRICTED_LABELS.has(label));
};

const RATE_LIMIT_TTL = 60_000;
export const RATE_LIMIT_SECONDS = RATE_LIMIT_TTL / 1000;
const rateLimitUntil = new Map<string, number>();

const rateLimitFailure = (key: string): ApiFailure | null => {
  const retryAt = rateLimitUntil.get(key);
  if (retryAt === undefined) return null;
  if (Date.now() < retryAt) return { ok: false, reason: "rateLimited", retryAt };
  rateLimitUntil.delete(key);
  return null;
};

const rememberRateLimit = (key: string): number => {
  const retryAt = Date.now() + RATE_LIMIT_TTL;
  rateLimitUntil.set(key, retryAt);
  return retryAt;
};

export const clearBlueskyRateLimits = (): void => {
  rateLimitUntil.clear();
};

export const fetchPost = async (
  uri: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ApiResult<BlueskyPost>> => {
  const requested = parseAtUri(uri);
  if (!requested || !isDidAccount(requested.authority)) return { ok: false, reason: "badRequest" };
  try {
    const response = await fetchImpl(
      `${BSKY_API}/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`,
      { signal },
    );
    if (!response.ok) return httpFailure(response);
    const body = asRecord(await response.json());
    const posts = Array.isArray(body?.posts) ? body.posts : [];
    const post = mapPost(posts[0], { did: requested.authority, rkey: requested.rkey });
    if (!post) return { ok: false, reason: "notFound" };
    return { ok: true, value: post };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, reason: "error" };
  }
};

const requestResolveHandle = async (
  handle: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<ApiResult<string>> => {
  const normalizedHandle = handle.toLowerCase();
  try {
    const response = await fetchImpl(
      `${BSKY_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(normalizedHandle)}`,
      { signal },
    );
    if (!response.ok) return resolveHandleFailure(response);
    const body = asRecord(await response.json());
    const did = asString(body?.did);

    return did && isDidAccount(did) ? { ok: true, value: did } : { ok: false, reason: "notFound" };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, reason: "error" };
  }
};

export const resolveHandle = (
  handle: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ApiResult<string>> => {
  if (!isHandleAccount(handle)) return Promise.resolve({ ok: false, reason: "badRequest" });
  return sharedRequest(
    fetchImpl,
    `handle|${handle.toLowerCase()}`,
    (requestSignal) => requestResolveHandle(handle, fetchImpl, requestSignal),
    signal,
  );
};

export const AUTHOR_FEED_LIMIT = 100;

const authorFeedFailure = (response: Response): ApiFailure => {
  if (response.status === 403 || response.status === 429) {
    return { ok: false, reason: "rateLimited" };
  }
  if (response.status === 400) return { ok: false, reason: "notFound" };
  return httpFailure(response);
};

const requestAuthorFeed = async (
  actor: string,
  cursor: string | null,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<ApiResult<BlueskyAuthorFeedPage>> => {
  if (!isDidAccount(actor)) return { ok: false, reason: "badRequest" };
  const key = `author|${actor}`;
  const limited = rateLimitFailure(key);
  if (limited) return limited;
  try {
    const params = new URLSearchParams({
      actor,
      filter: "posts_with_replies",
      includePins: "false",
      limit: String(AUTHOR_FEED_LIMIT),
    });
    if (cursor !== null) params.set("cursor", cursor);
    const response = await fetchImpl(
      `${BSKY_API}/app.bsky.feed.getAuthorFeed?${params.toString()}`,
      { signal },
    );
    if (!response.ok) {
      const result = authorFeedFailure(response);
      if (result.reason === "rateLimited") return { ...result, retryAt: rememberRateLimit(key) };
      return result;
    }
    const body = asRecord(await response.json());
    if (!Array.isArray(body?.feed)) return { ok: false, reason: "error" };
    const posts: BlueskyPost[] = [];
    for (const item of body.feed) {
      const entry = asRecord(item);
      if (entry?.reason) continue;
      const post = mapPost(entry?.post);
      const parsed = post ? parseAtUri(post.uri) : null;
      if (post && post.author.did === actor && parsed?.authority === actor) posts.push(post);
    }
    const nextCursor = asString(body.cursor);
    return { ok: true, value: { posts, cursor: nextCursor ?? null } };
  } catch (error) {
    if (signal.aborted) throw error;
    return { ok: false, reason: "error" };
  }
};

export const fetchAuthorFeed = (
  actor: string,
  cursor: string | null = null,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ApiResult<BlueskyAuthorFeedPage>> =>
  sharedRequest(
    fetchImpl,
    JSON.stringify([actor, cursor]),
    (requestSignal) => requestAuthorFeed(actor, cursor, fetchImpl, requestSignal),
    signal,
  );

export const searchTaggedPosts = async (
  query: string,
  sort: SearchSort,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ApiResult<BlueskyPost[]>> => {
  const key = `search|${sort}|${query}`;
  const limited = rateLimitFailure(key);
  if (limited) return limited;
  try {
    const response = await fetchImpl(
      `${BSKY_API}/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}&sort=${sort}`,
      { signal },
    );
    if (!response.ok) {
      const result = searchFailure(response);
      if (result.reason === "rateLimited") return { ...result, retryAt: rememberRateLimit(key) };
      return result;
    }
    const body = asRecord(await response.json());
    const raw = Array.isArray(body?.posts) ? body.posts : [];
    return {
      ok: true,
      value: raw.map((view) => mapPost(view)).filter((post): post is BlueskyPost => post !== null),
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, reason: "error" };
  }
};

export const searchQueries = async (
  queries: readonly string[],
  sort: SearchSort,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ApiResult<BlueskyPost[]>> => {
  const lists: BlueskyPost[][] = [];
  const failures: ApiFailure[] = [];
  for (const query of queries) {
    const result = await searchTaggedPosts(query, sort, fetchImpl, signal);
    if (result.ok) lists.push(result.value);
    else failures.push(result);
  }
  if (lists.length === 0) {
    const reason = failures.some((failure) => failure.reason === "rateLimited")
      ? "rateLimited"
      : failures.some((failure) => failure.reason === "badRequest")
        ? "badRequest"
        : "error";
    const retryAt = Math.max(
      ...failures
        .filter((failure) => failure.reason === "rateLimited" && failure.retryAt !== undefined)
        .map((failure) => failure.retryAt!),
    );
    return retryAt > 0 ? { ok: false, reason, retryAt } : { ok: false, reason };
  }

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

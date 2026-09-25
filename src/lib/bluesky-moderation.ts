import type { BlueskyPost } from "@/lib/bluesky-api";
import { MALFORMED_LABEL } from "@/lib/bluesky-labels";

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
  } else {
    labels.push(...post.author.accountLabels.filter((label) => ACCESS_LABELS.has(label)));
  }
  labels.push(
    ...post.author.profileLabels.filter(
      (label) => label === "!no-unauthenticated" || label === MALFORMED_LABEL,
    ),
  );
  return labels.some((label) => RESTRICTED_LABELS.has(label));
};

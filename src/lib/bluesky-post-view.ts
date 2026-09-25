import type { BlueskyPost } from "@/lib/bluesky-api";
import { isRestrictedPost } from "@/lib/bluesky-moderation";
import type { ModerationMode } from "@/lib/bluesky-moderation";
import { splitAnnotations } from "@/lib/bluesky-text";
import type { TextSegment } from "@/lib/bluesky-text";
import { extractPalindrome } from "@/lib/palindrome-extract";

export interface PostDigest {
  restricted: boolean;
  palindrome: string | null;
}

export interface PostView extends PostDigest {
  segments: TextSegment[];
}

// The cheap half: what moderation and extraction say, without splitting the
// text into segments. Callers that only filter on a post use this.
export const postDigest = (post: BlueskyPost, mode: ModerationMode = "loggedOut"): PostDigest => {
  const restricted = isRestrictedPost(post, mode);
  return {
    restricted,
    palindrome: restricted ? null : extractPalindrome(post.text, post.facetRanges),
  };
};

export const describePost = (post: BlueskyPost, mode: ModerationMode = "loggedOut"): PostView => ({
  ...postDigest(post, mode),
  segments: splitAnnotations(post.text, post.facetRanges),
});

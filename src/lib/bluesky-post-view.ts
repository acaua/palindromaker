import { isRestrictedPost } from "@/lib/bluesky-api";
import type { BlueskyPost, ModerationMode } from "@/lib/bluesky-api";
import { splitAnnotations } from "@/lib/bluesky-text";
import type { TextSegment } from "@/lib/bluesky-text";
import { extractPalindrome } from "@/lib/palindrome-extract";

export type PostViewMode = ModerationMode;

export interface PostView {
  restricted: boolean;
  palindrome: string | null;
  segments: TextSegment[];
}

export const describePost = (post: BlueskyPost, mode: PostViewMode = "loggedOut"): PostView => {
  const restricted = isRestrictedPost(post, mode);
  return {
    restricted,
    palindrome: restricted ? null : extractPalindrome(post.text, post.facetRanges),
    segments: splitAnnotations(post.text, post.facetRanges),
  };
};

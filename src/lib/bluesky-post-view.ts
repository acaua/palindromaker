import { isRestrictedPost } from "@/lib/bluesky-api";
import type { BlueskyPost } from "@/lib/bluesky-api";
import { splitAnnotations } from "@/lib/bluesky-text";
import type { TextSegment } from "@/lib/bluesky-text";
import { extractPalindrome } from "@/lib/palindrome-extract";

// How the app presents one post: whether it is restricted, the palindrome
// to read (null when restricted or when there is none), and the text split
// into plain and annotation spans. The card and the reader both ask this,
// so the "restricted wins over extracted" ordering and the two scans have
// one owner instead of one per surface.
export interface PostView {
  restricted: boolean;
  palindrome: string | null;
  segments: TextSegment[];
}

export const describePost = (post: BlueskyPost): PostView => {
  const restricted = isRestrictedPost(post);
  return {
    restricted,
    palindrome: restricted ? null : extractPalindrome(post.text, post.facetRanges),
    segments: splitAnnotations(post.text, post.facetRanges),
  };
};

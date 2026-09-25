import BlueskyPostCard from "@/components/bluesky-post-card";
import type { BlueskyPost } from "@/lib/bluesky-api";
import type { ModerationMode } from "@/lib/bluesky-moderation";

export default function BlueskyPostList({
  posts,
  showPalindromes = false,
  viewMode = "loggedOut",
  linkAuthor = true,
}: {
  posts: readonly BlueskyPost[];
  showPalindromes?: boolean;
  viewMode?: ModerationMode;
  linkAuthor?: boolean;
}) {
  return (
    <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
      {posts.map((post) => (
        <BlueskyPostCard
          key={post.uri}
          post={post}
          showPalindrome={showPalindromes}
          viewMode={viewMode}
          linkAuthor={linkAuthor}
        />
      ))}
    </ul>
  );
}

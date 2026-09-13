import BlueskyPostCard from "@/components/bluesky-post-card";
import type { BlueskyPost } from "@/lib/bluesky-api";

export default function BlueskyPostList({
  posts,
  onCheck,
}: {
  posts: readonly BlueskyPost[];
  onCheck: (uri: string) => void;
}) {
  return (
    <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
      {posts.map((post) => (
        <BlueskyPostCard key={post.uri} post={post} onCheck={onCheck} />
      ))}
    </ul>
  );
}

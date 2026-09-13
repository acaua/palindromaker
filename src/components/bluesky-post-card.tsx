import { useMemo } from "react";

import { useI18n } from "@/hooks/use-i18n";
import type { BlueskyPost } from "@/lib/bluesky-api";
import { extractPalindrome } from "@/lib/palindrome-extract";

// A hand-rendered result row: 100 official embeds would be 100 iframes,
// so the gallery stays light and opens the post in the viewer on demand.
export default function BlueskyPostCard({
  post,
  onCheck,
}: {
  post: BlueskyPost;
  onCheck: (uri: string) => void;
}) {
  const { t } = useI18n();
  const palindrome = useMemo(() => extractPalindrome(post.text, post.facetRanges), [post]);

  return (
    <li className="flex flex-col rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_10px_30px_-20px_rgba(0,0,0,0.18)]">
      <header className="flex items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {post.author.displayName ?? `@${post.author.handle}`}
          </p>
          <p className="truncate text-xs text-gray-500">@{post.author.handle}</p>
        </div>
        {palindrome && (
          <span className="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            {t("post.palindromeBadge")}
          </span>
        )}
      </header>
      <p className="mt-2 line-clamp-6 whitespace-pre-wrap break-words text-sm text-gray-700">
        {post.text}
      </p>
      <div className="mt-auto pt-3">
        <button
          type="button"
          onClick={() => onCheck(post.uri)}
          className="w-full cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
        >
          {t("post.checkCard")}
        </button>
      </div>
    </li>
  );
}

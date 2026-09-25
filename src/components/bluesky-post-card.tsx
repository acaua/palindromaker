import { useMemo } from "react";

import { Link } from "@tanstack/react-router";

import { useI18n } from "@/hooks/use-i18n";
import type { BlueskyPost } from "@/lib/bluesky-api";
import { postHash } from "@/lib/bluesky-post";
import { describePost } from "@/lib/bluesky-post-view";
import type { ModerationMode } from "@/lib/bluesky-moderation";
import { formatRelativeTime } from "@/lib/relative-time";

export default function BlueskyPostCard({
  post,
  showPalindrome = false,
  viewMode = "loggedOut",
  linkAuthor = true,
}: {
  post: BlueskyPost;
  showPalindrome?: boolean;
  viewMode?: ModerationMode;
  linkAuthor?: boolean;
}) {
  const { lang, t } = useI18n();
  const view = useMemo(() => describePost(post, viewMode), [post, viewMode]);
  const relative = formatRelativeTime(post.createdAt, lang);
  const actionLabel = view.palindrome ? t("post.viewPalindromeCard") : t("post.viewCard");

  return (
    <li className="flex flex-col rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_10px_30px_-20px_rgba(0,0,0,0.18)]">
      <header className="flex items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {post.author.displayName ?? `@${post.author.handle}`}
          </p>
          {linkAuthor ? (
            <Link
              to="/explore"
              search={{ account: post.author.did }}
              className="block truncate text-xs text-gray-500 hover:text-violet-700"
            >
              @{post.author.handle}
            </Link>
          ) : (
            <p className="truncate text-xs text-gray-500">@{post.author.handle}</p>
          )}
        </div>
        {view.palindrome && (
          <span className="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            {t("post.palindromeBadge")}
          </span>
        )}
      </header>
      {showPalindrome && view.palindrome && (
        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2">
          <p className="text-xs font-medium text-emerald-800">{t("post.palindromeLabel")}</p>
          <p className="mt-1 font-mono text-sm break-words text-emerald-950">{view.palindrome}</p>
        </div>
      )}
      <p className="mt-2 line-clamp-6 text-sm whitespace-pre-wrap break-words text-gray-700">
        {showPalindrome && <span className="sr-only">{t("post.originalLabel")}: </span>}
        {view.segments.map((segment) =>
          segment.annotation ? (
            <span key={segment.start} className="text-gray-500">
              {segment.text}
            </span>
          ) : (
            <span key={segment.start}>{segment.text}</span>
          ),
        )}
      </p>
      <div className="mt-auto pt-3">
        {relative && (
          <time dateTime={post.createdAt} className="block text-xs text-gray-500">
            {relative}
          </time>
        )}
        <Link
          to="/p"
          hash={postHash(post.uri)}
          aria-label={`${actionLabel} — @${post.author.handle}`}
          className="mt-2 block w-full cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-center text-sm font-medium text-violet-700 transition hover:bg-violet-100"
        >
          {actionLabel}
        </Link>
      </div>
    </li>
  );
}

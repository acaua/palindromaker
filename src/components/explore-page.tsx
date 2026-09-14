import { useState } from "react";

import BlueskyPostList from "@/components/bluesky-post-list";
import PageHeading from "@/components/page-heading";
import PostLinkForm from "@/components/post-link-form";
import ReaderMain from "@/components/reader-main";
import { useI18n } from "@/hooks/use-i18n";
import { useOpenPost } from "@/hooks/use-open-post";
import { useBlueskySearch } from "@/hooks/use-bluesky-search";
import { useCountdown } from "@/hooks/use-countdown";
import { retryIn } from "@/lib/i18n";
import type { SearchSort } from "@/lib/bluesky-api";

// the shared status line for the failures that offer a retry
const RetryLine = ({
  message,
  tone,
  onRetry,
  retryLabel,
  disabled = false,
}: {
  message: string;
  tone: "warn" | "error";
  onRetry: () => void;
  retryLabel: string;
  disabled?: boolean;
}) => (
  <p role="status" className={`text-sm ${tone === "warn" ? "text-amber-700" : "text-red-700"}`}>
    {message}{" "}
    <button
      type="button"
      onClick={onRetry}
      disabled={disabled}
      className="cursor-pointer underline disabled:cursor-not-allowed"
    >
      {retryLabel}
    </button>
  </p>
);

// The throttle retry: mounted fresh on every rateLimited episode, so its
// countdown always starts over. The endpoint sends no Retry-After, so the
// cooldown comes from the search hook — the API's throttle window — and
// firing straight back in only spends.
const ThrottledRetry = ({ onRetry, cooldown }: { onRetry: () => void; cooldown: number }) => {
  const { lang, t } = useI18n();
  const remaining = useCountdown(cooldown);
  return (
    <RetryLine
      message={t("explore.rateLimited")}
      tone="warn"
      onRetry={onRetry}
      retryLabel={remaining > 0 ? retryIn(lang, remaining) : t("explore.retry")}
      disabled={remaining > 0}
    />
  );
};

export default function ExplorePage() {
  const { lang, t } = useI18n();
  const [sort, setSort] = useState<SearchSort>("top");
  const state = useBlueskySearch(lang, sort);
  const openPost = useOpenPost();

  return (
    <ReaderMain>
      <div className="mx-auto w-full max-w-3xl">
        <PageHeading>{t("explore.title")}</PageHeading>
        <p className="mt-2.5 max-w-xl text-sm leading-5 text-gray-600 md:mt-3 md:text-base md:leading-6">
          {t("explore.hint")}
        </p>

        <div className="mt-5 rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:mt-6">
          <PostLinkForm onSubmitUrl={openPost} />
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div
            role="group"
            aria-label={t("explore.sort")}
            className="inline-flex rounded-lg bg-white p-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            {(["top", "latest"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={sort === option}
                onClick={() => setSort(option)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition ${
                  sort === option ? "bg-violet-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {option === "top" ? t("explore.sortTop") : t("explore.sortRecent")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {state.status === "loading" && (
            <>
              <span role="status" className="sr-only">
                {t("explore.loading")}
              </span>
              <ul aria-hidden="true" className="grid list-none gap-3 p-0 sm:grid-cols-2">
                {["a", "b", "c", "d"].map((key) => (
                  <li
                    key={key}
                    className="h-36 animate-pulse rounded-xl bg-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                  />
                ))}
              </ul>
            </>
          )}

          {state.status === "ready" && state.posts.length === 0 && (
            <p role="status" className="text-sm text-gray-500">
              {t("explore.empty")}
            </p>
          )}

          {state.status === "ready" && state.posts.length > 0 && (
            <BlueskyPostList posts={state.posts} onCheck={openPost} />
          )}

          {state.status === "rateLimited" && (
            <ThrottledRetry onRetry={state.retry} cooldown={state.cooldownSeconds} />
          )}

          {(state.status === "error" || state.status === "badRequest") && (
            <RetryLine
              message={state.status === "badRequest" ? t("explore.badRequest") : t("explore.error")}
              tone="error"
              onRetry={state.retry}
              retryLabel={t("explore.retry")}
            />
          )}
        </div>
      </div>
    </ReaderMain>
  );
}

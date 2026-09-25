import { Link } from "@tanstack/react-router";

import BlueskyPostList from "@/components/bluesky-post-list";
import PageHeading from "@/components/page-heading";
import PostSkeletonGrid from "@/components/post-skeleton-grid";
import { RetryLine, ThrottledRetry } from "@/components/retry-line";
import { useBlueskyAuthorFeed } from "@/hooks/use-bluesky-author-feed";
import type { AuthorFeedFailure } from "@/hooks/use-bluesky-author-feed";
import { useI18n } from "@/hooks/use-i18n";
import { isDidAccount, normalizeAccount } from "@/lib/bluesky-account";

const RateLimitedRetry = ({
  failure,
  onRetry,
}: {
  failure: AuthorFeedFailure;
  onRetry: () => void;
}) =>
  failure.reason === "rateLimited" ? (
    <ThrottledRetry
      key={failure.retryAt}
      cooldown={failure.cooldownSeconds}
      retryAt={failure.retryAt}
      onRetry={onRetry}
    />
  ) : null;

const ValidAccountFeed = ({ account }: { account: string }) => {
  const { t } = useI18n();
  const state = useBlueskyAuthorFeed(account);

  if (state.status === "loading") {
    return <PostSkeletonGrid label={t("explore.loading")} itemClassName="h-48" />;
  }
  if (state.status === "notFound" || state.status === "error" || state.status === "rateLimited") {
    return state.failure?.reason === "rateLimited" ? (
      <RateLimitedRetry failure={state.failure} onRetry={state.retry} />
    ) : (
      <RetryLine
        message={state.status === "notFound" ? t("account.notFound") : t("explore.error")}
        tone="error"
        onRetry={state.retry}
        retryLabel={t("explore.retry")}
      />
    );
  }

  return (
    <>
      {state.posts.length > 0 && (
        <BlueskyPostList
          posts={state.posts}
          showPalindromes
          viewMode="accountExplore"
          linkAuthor={false}
        />
      )}
      {state.posts.length === 0 && (
        <p role="status" className="text-sm text-gray-500">
          {state.allLoadedPostsRestricted
            ? t("account.restricted")
            : state.hasMore
              ? t("account.noneInPage")
              : t("account.empty")}
        </p>
      )}
      {state.nextPageFailure?.reason === "rateLimited" && (
        <RateLimitedRetry failure={state.nextPageFailure} onRetry={state.retry} />
      )}
      {state.nextPageFailure && state.nextPageFailure.reason !== "rateLimited" && (
        <RetryLine
          message={t("account.nextError")}
          tone="error"
          onRetry={state.retry}
          retryLabel={t("explore.retry")}
        />
      )}
      {state.hasMore && !state.nextPageFailure && (
        <button
          type="button"
          onClick={state.loadMore}
          disabled={state.isLoadingMore}
          className="mx-auto mt-5 block cursor-pointer rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.isLoadingMore ? t("account.loadingMore") : t("account.loadOlder")}
        </button>
      )}
    </>
  );
};

export default function AccountExplore({ input }: { input: string }) {
  const { t } = useI18n();
  const account = normalizeAccount(input);

  return (
    <>
      <PageHeading>
        {t("account.heading")}{" "}
        <span className="text-violet-700">
          {account && isDidAccount(account) ? account : `@${account ?? input}`}
        </span>
      </PageHeading>
      <p className="mt-2 max-w-xl text-sm leading-5 text-gray-600 md:mt-3 md:text-base md:leading-6">
        {t("account.hint")}
      </p>
      <div className="mt-5">
        <Link to="/explore" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          {t("account.back")}
        </Link>
      </div>
      <div className="mt-5">
        {account ? (
          <ValidAccountFeed account={account} />
        ) : (
          <p role="alert" className="text-sm text-red-700">
            {t("account.invalid")}
          </p>
        )}
      </div>
    </>
  );
}

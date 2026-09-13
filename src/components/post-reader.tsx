import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { LinkIcon } from "@heroicons/react/24/solid";

import BlueskyEmbed from "@/components/bluesky-embed";
import CopyButton from "@/components/copy-button";
import PageHeading from "@/components/page-heading";
import Reader from "@/components/reader";
import { useI18n } from "@/hooks/use-i18n";
import { useBlueskyPost } from "@/hooks/use-bluesky-post";
import { isRestrictedPost } from "@/lib/bluesky-api";
import { postPageUrl } from "@/lib/bluesky-post";
import type { PostRef } from "@/lib/bluesky-post";
import { extractPalindrome } from "@/lib/palindrome-extract";

// The post view is one 600px column: the official embed is designed for
// that width, and the hint, viewer and links all align to it. No vertical
// auto-margin, so the content sits against the top rather than floating.
const COLUMN = "mx-auto w-full max-w-[600px]";

const Notice = ({ text }: { text: string }) => {
  const { t } = useI18n();
  return (
    <div className="mt-6">
      <PageHeading>{t("post.title")}</PageHeading>
      <p className="mt-4 text-sm leading-6 text-gray-600 md:text-base md:leading-7">{text}</p>
    </div>
  );
};

// the shared shape of the two "no viewer" cases: a notice plus the links
const NoticeBlock = ({ text, links }: { text: string; links: ReactNode }) => (
  <>
    <Notice text={text} />
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{links}</div>
  </>
);

// The post-view half of a #b= link: the original post as an official
// embed, and — only the palindrome the post contains — in the same
// viewer the #t= path uses. A post with no palindrome (or a restricted
// one) still shows its embed, just without a viewer.
export default function PostReader({ input }: { input: PostRef }) {
  const { t } = useI18n();
  const { status, post, retry } = useBlueskyPost(input);
  const extracted = useMemo(
    () => (post && !isRestrictedPost(post) ? extractPalindrome(post.text, post.facetRanges) : null),
    [post],
  );

  // The router only moves focus on a pathname change; the paste form
  // navigates to this same route with a new hash, so the moment the post
  // resolves (or fails) the heading takes focus and is announced. (When
  // there is a viewer, its own autofocus wins — also announced, by name.)
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status === "loading" || status === "idle") return;
    rootRef.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [status]);

  if (status !== "ready" || !post) {
    const failed = status === "notFound" || status === "badRequest" || status === "error";
    const message =
      status === "notFound"
        ? t("post.notFound")
        : status === "badRequest"
          ? t("post.badRequest")
          : status === "error"
            ? t("post.error")
            : t("post.loading");
    return (
      <div ref={rootRef} className={COLUMN}>
        <PageHeading>{t("post.title")}</PageHeading>
        <p role="status" className="mt-4 text-sm leading-6 text-gray-600 md:text-base md:leading-7">
          {message}
        </p>
        {failed && (
          <button
            type="button"
            onClick={retry}
            className="mt-4 cursor-pointer rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            {t("post.retry")}
          </button>
        )}
      </div>
    );
  }

  const restricted = isRestrictedPost(post);
  const pageUrl = postPageUrl(post.uri, post.author.handle);
  const links = (
    <>
      <CopyButton
        label={t("post.copyLink")}
        title={t("post.copyLink")}
        copiedLabel={t("share.copied")}
        icon={<LinkIcon aria-hidden="true" className="h-4 w-4 text-gray-500" />}
        getText={() => location.href}
      />
      {pageUrl && (
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-violet-700 hover:bg-gray-100"
        >
          {t("post.viewOnBluesky")}
        </a>
      )}
    </>
  );

  return (
    <div ref={rootRef} className={COLUMN}>
      <BlueskyEmbed uri={post.uri} title={t("post.embedTitle")} />
      {restricted ? (
        <NoticeBlock text={t("post.restricted")} links={links} />
      ) : extracted ? (
        <Reader text={extracted} extraFooter={links} hint={t("post.hint")} />
      ) : (
        <NoticeBlock text={t("post.noPalindrome")} links={links} />
      )}
    </div>
  );
}

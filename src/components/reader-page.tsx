import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import PageHeading from "@/components/page-heading";
import PostLinkForm from "@/components/post-link-form";
import PostReader from "@/components/post-reader";
import Reader from "@/components/reader";
import ReaderMain from "@/components/reader-main";
import { useI18n } from "@/hooks/use-i18n";
import { useOpenPost } from "@/hooks/use-open-post";
import { readPostRef } from "@/lib/bluesky-post";
import { readShareText } from "@/lib/share-link";

// The /p route: a destination reached through shared links. Two payloads
// live here — #t= (the text itself) and #b= (a Bluesky post to fetch and
// embed). The fragment is read from router state, not a one-time
// initializer, because pasting a link here navigates to *this same route*
// with a new hash and the page must react.
export default function ReaderPage() {
  const { t } = useI18n();
  const hash = useRouterState({ select: ({ location }) => location.hash });
  const postRef = useMemo(() => readPostRef(hash), [hash]);
  const shared = useMemo(() => readShareText(hash), [hash]);
  const openPost = useOpenPost();

  if (postRef) {
    return (
      <ReaderMain>
        <PostReader input={postRef} />
      </ReaderMain>
    );
  }

  if (!shared) {
    return (
      <ReaderMain>
        <div className="mx-auto w-full max-w-3xl">
          <PageHeading>{t("reader.empty.title")}</PageHeading>
          <p className="mt-4 text-sm leading-6 text-gray-600 md:text-base md:leading-7">
            {t("reader.empty.body")}
          </p>
          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <PostLinkForm onSubmitUrl={openPost} />
          </div>
          <p className="mt-6">
            <Link
              to="/"
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              {t("reader.back")}
            </Link>
          </p>
        </div>
      </ReaderMain>
    );
  }

  return (
    <ReaderMain>
      <Reader text={shared} />
    </ReaderMain>
  );
}

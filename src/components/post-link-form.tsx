import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";

import { useI18n } from "@/hooks/use-i18n";
import { resolveHandle } from "@/lib/bluesky-api";
import { atUriFor, parsePostInput } from "@/lib/bluesky-post";

// Paste a bsky.app post link (or an at-uri) and hand the resolved at-uri
// back; how it navigates is the caller's business, which keeps this
// testable without a router.
export default function PostLinkForm({ onSubmitUrl }: { onSubmitUrl: (uri: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ref = parsePostInput(value);
    if (!ref) {
      setError(true);
      return;
    }
    setError(false);
    if (ref.kind === "uri") {
      onSubmitUrl(ref.uri);
      return;
    }
    setBusy(true);
    const resolved = await resolveHandle(ref.handle);
    setBusy(false);
    if (!resolved.ok) {
      setError(true);
      return;
    }
    onSubmitUrl(atUriFor(resolved.value, ref.rkey));
  };

  return (
    <section aria-labelledby="post-check-title">
      <h2 id="post-check-title" className="text-lg font-semibold text-gray-900">
        {t("post.checkTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{t("post.checkHint")}</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(false);
          }}
          placeholder={t("post.checkPlaceholder")}
          aria-labelledby="post-check-title"
          spellCheck="false"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
        <button
          type="submit"
          disabled={busy || value.trim() === ""}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-600"
        >
          <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
          {busy ? t("post.checkResolving") : t("post.checkButton")}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {t("post.checkError")}
        </p>
      )}
    </section>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";

import { useBlueskyHandle } from "@/hooks/use-bluesky-handle";
import { useI18n } from "@/hooks/use-i18n";
import { atUriFor, parsePostInput } from "@/lib/bluesky-post";

type Attempt = { id: number; handle: string; rkey: string };

export default function PostLinkForm({ onSubmitUrl }: { onSubmitUrl: (uri: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [parseError, setParseError] = useState(false);
  const nextAttemptIdRef = useRef(0);
  const navigatedAttemptRef = useRef<number | null>(null);
  const titleId = useId();
  const errorId = useId();
  const handleQuery = useBlueskyHandle(attempt?.handle ?? null);

  useEffect(() => {
    if (
      !attempt ||
      !handleQuery.data ||
      handleQuery.isFetching ||
      handleQuery.isPending ||
      handleQuery.isError ||
      navigatedAttemptRef.current === attempt.id
    ) {
      return;
    }
    navigatedAttemptRef.current = attempt.id;
    onSubmitUrl(atUriFor(handleQuery.data, attempt.rkey));
  }, [
    attempt,
    handleQuery.data,
    handleQuery.isError,
    handleQuery.isFetching,
    handleQuery.isPending,
    onSubmitUrl,
  ]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ref = parsePostInput(value);
    if (!ref) {
      setParseError(true);
      setAttempt(null);
      return;
    }
    setParseError(false);
    if (ref.kind === "uri") {
      setAttempt(null);
      onSubmitUrl(ref.uri);
      return;
    }
    if (attempt?.handle === ref.handle && attempt.rkey === ref.rkey && handleQuery.isError) {
      void handleQuery.refetch();
      return;
    }
    setAttempt({ id: ++nextAttemptIdRef.current, handle: ref.handle, rkey: ref.rkey });
  };

  const busy = attempt !== null && handleQuery.isPending;
  const error = parseError || (attempt !== null && handleQuery.isError);

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="text-lg font-semibold text-gray-900">
        {t("post.checkTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{t("post.checkHint")}</p>
      <form onSubmit={submit} aria-busy={busy} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setParseError(false);
            setAttempt(null);
          }}
          placeholder={t("post.checkPlaceholder")}
          aria-labelledby={titleId}
          aria-invalid={error}
          aria-describedby={error ? errorId : undefined}
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
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">
          {t("post.checkError")}
        </p>
      )}
    </section>
  );
}

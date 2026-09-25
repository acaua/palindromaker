import { useId, useState } from "react";
import type { FormEvent } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

import { useI18n } from "@/hooks/use-i18n";
import { normalizeAccount } from "@/lib/bluesky-account";

export default function AccountForm({
  onSubmitAccount,
}: {
  onSubmitAccount: (account: string) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const titleId = useId();
  const errorId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const account = normalizeAccount(value);
    if (!account) {
      setError(true);
      return;
    }
    setError(false);
    onSubmitAccount(account);
  };

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="text-lg font-semibold text-gray-900">
        {t("account.formTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{t("account.formHint")}</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(false);
          }}
          placeholder={t("account.placeholder")}
          aria-labelledby={titleId}
          aria-invalid={error}
          aria-describedby={error ? errorId : undefined}
          spellCheck="false"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
        <button
          type="submit"
          disabled={value.trim() === ""}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-600"
        >
          <MagnifyingGlassIcon aria-hidden="true" className="h-4 w-4" />
          {t("account.button")}
        </button>
      </form>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">
          {t("account.invalid")}
        </p>
      )}
    </section>
  );
}

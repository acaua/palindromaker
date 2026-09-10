import { useState } from "react";
import { Link } from "@tanstack/react-router";

import Reader from "@/components/reader";
import { useI18n } from "@/hooks/use-i18n";
import { readShareText } from "@/lib/share-link";

// the /p route: a destination, not a browsable page (deliberately not in
// NAV_ENTRIES). The fragment is the whole payload, so it is read once on
// mount like the editor reads storage; anything unexpected — no hash, an
// empty t=, a malformed or over-long one — gets the friendly empty card.
export default function ReaderPage() {
  const { t } = useI18n();
  const [shared] = useState(() => readShareText());

  if (!shared) {
    return (
      <main className="flex flex-1 flex-col bg-[#faf8f5] px-5 py-5 md:py-8">
        <div className="mx-auto w-full max-w-3xl">
          <h1
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-gray-900 outline-none md:text-3xl"
          >
            {t("reader.empty.title")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-gray-600 md:text-base md:leading-7">
            {t("reader.empty.body")}
          </p>
          <p className="mt-6">
            <Link
              to="/"
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              {t("reader.back")}
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-[#faf8f5] px-5 py-5 md:py-8">
      <Reader text={shared} />
    </main>
  );
}

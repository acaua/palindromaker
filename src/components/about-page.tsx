import { useI18n } from "@/hooks/use-i18n";

// the About page: plain prose in the same column the editor uses, so both
// routes read as one site
export default function AboutPage() {
  const { t } = useI18n();
  return (
    <main className="flex flex-1 flex-col px-5 pb-10 pt-6 md:pt-10">
      <div className="mx-auto w-full max-w-3xl">
        <h1
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight text-gray-900 outline-none md:text-3xl"
        >
          {t("about.title")}
        </h1>
        <div className="mt-4 space-y-4 text-sm leading-6 text-gray-600 md:mt-5 md:text-base md:leading-7">
          <p>{t("about.body1")}</p>
          <p>{t("about.body2")}</p>
          <p>{t("about.body3")}</p>
        </div>
      </div>
    </main>
  );
}

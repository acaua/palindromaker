import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

import { useI18n } from "@/hooks/use-i18n";
import { formatCount, interpolate } from "@/lib/i18n";
import type { ActiveStep, ReaderStep } from "@/lib/reader-analysis";

// The active mirror step. Real buttons are what make the reader steppable
// without a keyboard and reachable by assistive tech; tapping a letter is
// only a pointer shortcut. The label is a live region so a button press is
// announced, and the boundaries never loop. Stepping itself lives in the
// reader (`onStep`), so the clamping rule has one owner.
export default function ReaderStepper({
  steps,
  active,
  onStep,
}: {
  steps: ReaderStep[];
  active: ActiveStep | null;
  onStep: (direction: 1 | -1) => void;
}) {
  const { lang, t } = useI18n();
  const last = steps.length - 1;
  // the pair ordinal among the pairs alone: a lone center is not one, so an
  // odd palindrome never says "Pair 3 of 2"
  const pairsBefore = (step: number) =>
    steps.slice(0, step).filter((candidate) => !candidate.loneCenter).length;

  const label = active
    ? (() => {
        const step = steps[active.step];
        if (step.loneCenter) return t("reader.stepCenter");
        if (step.center) return t("reader.centerPair");
        return interpolate(t("reader.pairLabel"), {
          n: formatCount(lang, pairsBefore(active.step) + 1),
          m: formatCount(lang, steps.filter((candidate) => !candidate.loneCenter).length),
        });
      })()
    : "";

  const button =
    "flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent";

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label={t("reader.stepPrev")}
        // with no active step yet, Prev enters at the center and Next at the
        // outermost pair (the same rule the reader applies to a swipe)
        disabled={active !== null && active.step === 0}
        onClick={() => onStep(-1)}
        className={button}
      >
        <ChevronLeftIcon aria-hidden="true" className="h-5 w-5" />
      </button>
      <span aria-live="polite" className="min-w-28 text-center text-sm text-gray-600">
        {label}
      </span>
      <button
        type="button"
        aria-label={t("reader.stepNext")}
        disabled={active !== null && active.step === last}
        onClick={() => onStep(1)}
        className={button}
      >
        <ChevronRightIcon aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}

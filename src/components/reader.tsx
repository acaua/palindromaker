import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/solid";
import { Link } from "@tanstack/react-router";

import CopyButton from "@/components/copy-button";
import { ReaderLegend } from "@/components/legend";
import PageHeading from "@/components/page-heading";
import ReaderStepper from "@/components/reader-stepper";
import { useI18n } from "@/hooks/use-i18n";
import { useSwipeStep } from "@/hooks/use-swipe-step";
import { analyzeReaderText } from "@/lib/reader-analysis";
import type { ActiveStep, ReaderGrapheme } from "@/lib/reader-analysis";
import { textHash } from "@/lib/share-link";
// The reader: the same card, typography, center brackets and gap highlight
// as the editor, rendered as static semantic text instead of a locked
// ProseMirror view. Read-only-ness is now structural — nothing is editable,
// so no input event needs claiming and no mutation can slip through — and
// the mirror exploration is pointer-friendly: tap a letter to light its
// mirror pair, or step with the buttons below (the accessible path). Native
// selection, copy and vertical scroll are never intercepted.
export default function Reader({
  text,
  extraFooter,
  hint,
}: {
  text: string;
  // the post view adds Copy link / View on Bluesky to the same footer
  extraFooter?: ReactNode;
  // the post view swaps the shared-link line for its own
  hint?: string;
}) {
  const { t } = useI18n();
  const analysis = useMemo(() => analyzeReaderText(text), [text]);
  // the active step is held with the text it was chosen on, so a new shared
  // link drops it during render instead of through a reset effect
  const [activeState, setActiveState] = useState<{ text: string; value: ActiveStep } | null>(null);
  const active = activeState?.text === text ? activeState.value : null;
  const hasSteps = analysis.pairCount > 0;
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const previousTextRef = useRef(text);

  // A same-route #t= replacement is a new shared link: return to the top and
  // announce the heading. The first mount is deliberately left alone, so a
  // plain page load never steals focus or scroll.
  useEffect(() => {
    if (previousTextRef.current === text) return;
    previousTextRef.current = text;
    window.scrollTo(0, 0);
    rootRef.current?.querySelector("h1")?.focus();
  }, [text]);

  const pivotTo = useCallback(
    (step: number, chosen?: number) => {
      setActiveState({
        text,
        value: {
          step,
          pivot: chosen ?? analysis.steps[step]?.graphemes[0] ?? 0,
        },
      });
    },
    [text, analysis],
  );

  // Move one step: from no active step, Prev enters at the center and Next at
  // the outermost pair; otherwise clamp so the boundaries never loop.
  const stepTo = useCallback(
    (direction: 1 | -1) => {
      const last = analysis.steps.length - 1;
      if (last < 0) return;
      if (!active) {
        pivotTo(direction === 1 ? 0 : last);
        return;
      }
      pivotTo(Math.min(last, Math.max(0, active.step + direction)));
    },
    [active, analysis, pivotTo],
  );

  // The swipe is the accelerant, and unlike the buttons it must yield to a
  // native selection: a drag or long-press that selects text is not a gesture
  // for stepping. The stepper buttons stay unguarded — they are the accessible
  // path and cannot be conflated with a text selection.
  const stepFromGesture = useCallback(
    (direction: 1 | -1) => {
      if (!window.getSelection()?.isCollapsed) return;
      stepTo(direction);
    },
    [stepTo],
  );

  useSwipeStep(surfaceRef, stepFromGesture);

  const onSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    // a drag-select leaves a non-collapsed selection on mouseup and can still
    // fire click: don't steal it for a tap
    if (!window.getSelection()?.isCollapsed) return;
    const element = (event.target as HTMLElement).closest<HTMLElement>("[data-step]");
    if (!element) return;
    const step = Number(element.dataset.step);
    const grapheme = Number(element.dataset.grapheme);
    if (!Number.isNaN(step) && !Number.isNaN(grapheme)) pivotTo(step, grapheme);
  };

  const highlightClasses = (grapheme: ReaderGrapheme): string => {
    const classes: string[] = [];
    if (grapheme.role.center === "left" || grapheme.role.center === "both")
      classes.push("pm-center1");
    if (grapheme.role.center === "right" || grapheme.role.center === "both")
      classes.push("pm-center2");
    if (grapheme.role.center) classes.push("bg-blue-200");
    if (grapheme.role.gap) classes.push("bg-red-300");
    if (grapheme.step !== undefined) classes.push("cursor-pointer");
    if (active && grapheme.step === active.step) {
      // a lone center is its own mirror, so it reads as both halves at once
      // (the editor paints its center letter with both purple classes too)
      const loneCenter = analysis.steps[active.step].loneCenter;
      if (grapheme.index === active.pivot || loneCenter) classes.push("bg-purple-200");
      if (grapheme.index !== active.pivot || loneCenter) classes.push("bg-purple-400");
    }
    return classes.join(" ");
  };

  return (
    <div ref={rootRef} className="m-auto w-full max-w-3xl">
      <PageHeading>{t("reader.title")}</PageHeading>
      <p className="mt-2.5 max-w-xl text-sm leading-5 text-gray-600 md:mt-3 md:text-base md:leading-6">
        {hint ?? t("reader.hint")}
      </p>
      <p className="mt-1 max-w-xl text-sm leading-5 text-gray-500">
        {t("reader.normalizationHint")}
        {hasSteps && ` ${t("reader.tapHint")}`}
      </p>
      <p
        role="status"
        className={`mt-2 text-sm font-medium ${
          !analysis.hasLetters
            ? "text-gray-500"
            : analysis.isPalindrome
              ? "text-green-700"
              : "text-red-700"
        }`}
      >
        {!analysis.hasLetters
          ? t("reader.noLetters")
          : analysis.isPalindrome
            ? t("status.palindrome")
            : t("status.notPalindrome")}
      </p>
      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_20px_50px_-20px_rgba(0,0,0,0.18)] md:mt-8">
        <div
          ref={surfaceRef}
          role="region"
          aria-label={t("reader.ariaLabel")}
          onClick={onSurfaceClick}
          className="min-h-32 p-6 pb-5 font-mono text-base leading-7 tracking-wide whitespace-pre-wrap text-gray-900 outline-none md:min-h-40 md:p-10 md:pb-8 md:text-xl md:leading-10"
        >
          {analysis.lines.map((line) => (
            <p key={line.id}>
              {line.graphemes.map((grapheme) => (
                <span
                  key={grapheme.index}
                  data-grapheme={grapheme.index}
                  data-step={grapheme.step}
                  className={highlightClasses(grapheme)}
                >
                  {grapheme.value}
                </span>
              ))}
            </p>
          ))}
        </div>
        <footer className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 md:justify-between md:px-5">
          <CopyButton
            label={t("reader.copyText")}
            title={t("reader.copyText")}
            copiedLabel={t("share.copied")}
            className="max-md:min-h-11"
            icon={<ClipboardDocumentIcon aria-hidden="true" className="h-4 w-4 text-gray-500" />}
            getText={() => text}
          />
          {/* the silent replace: / takes the same #t= fragment as its
              initial content, and the first edit there replaces the local
              doc — accepted (see editor.tsx) */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              hash={textHash(text)}
              className="inline-flex max-md:min-h-11 items-center rounded-lg px-2 py-1.5 text-sm font-medium text-violet-700 hover:bg-gray-100"
            >
              {t("reader.edit")}
            </Link>
            {extraFooter}
          </div>
        </footer>
      </div>
      {hasSteps && <ReaderStepper steps={analysis.steps} active={active} onStep={stepTo} />}
      <ReaderLegend />
    </div>
  );
}

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowsRightLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

import type { Dictionary, MirrorMatch } from "@/lib/dictionary";
import { mirrorMatch, mirrorWord } from "@/lib/dictionary";

const ROW_HEIGHT = 32;
const OVERSCAN = 6;

// how a result's mirror is marked; the same colors the finder legend shows
const markers = {
  pair: {
    className: "text-purple-700",
    label: "mirror is also a word",
    Icon: ArrowsRightLeftIcon,
  },
  palindrome: {
    className: "text-green-700",
    label: "palindrome word",
    Icon: CheckCircleIcon,
  },
} as const;

const ResultRow = ({
  word,
  match,
  index,
  total,
  offset,
}: {
  word: string;
  match: MirrorMatch;
  index: number;
  total: number;
  offset: number;
}) => {
  const mirror = mirrorWord(word);
  const marker = match ? markers[match] : null;

  return (
    <div
      role="listitem"
      aria-posinset={index + 1}
      aria-setsize={total}
      className="absolute top-0 left-0 flex h-8 w-full items-center gap-3 px-4 hover:bg-white"
      style={{ transform: `translateY(${offset}px)` }}
    >
      <span className="min-w-0 flex-1 truncate" title={word}>
        {word}
      </span>
      <span
        className={`min-w-0 truncate ${marker?.className ?? "text-gray-500"}`}
        title={marker?.label ?? mirror}
      >
        {mirror}
        {marker && <span className="sr-only"> ({marker.label})</span>}
      </span>
      {marker && (
        <marker.Icon
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 ${marker.className}`}
        />
      )}
    </div>
  );
};

// The result list: broad searches match hundreds of thousands of words, so
// only the rows in view exist in the DOM.
export default function WordFinderResults({
  words,
  dictionary,
}: {
  words: string[];
  dictionary: Dictionary;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // TanStack Virtual's instance is not compiler-memoizable; safe here since
  // it stays local to this component
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: words.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    // avoid React 19's "flushSync was called from inside a lifecycle method" warning
    useFlushSync: false,
  });

  // a new search starts at the top, not wherever the last one was scrolled
  useEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [words, virtualizer]);

  return (
    <>
      <div className="flex items-center justify-between border-y border-gray-200 px-4 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        <span>Word</span>
        <span>
          Mirror · {words.length.toLocaleString()} result
          {words.length === 1 ? "" : "s"}
        </span>
      </div>
      <div
        ref={scrollerRef}
        role="list"
        aria-label="results"
        className="max-h-80 overflow-y-auto font-mono text-base lg:max-h-[398px]"
      >
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((row) => (
            <ResultRow
              key={words[row.index]}
              word={words[row.index]}
              match={mirrorMatch(dictionary, words[row.index])}
              index={row.index}
              total={words.length}
              offset={row.start}
            />
          ))}
        </div>
      </div>
    </>
  );
}

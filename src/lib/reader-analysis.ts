import checkPalindrome, { isLetter, normalizedUnits } from "@/lib/check-palindrome";

// the reader's one analysis: the shared raw text seen the way the editor and
// the checker see it, but rendered as stable grapheme clusters. Segmentation
// matches src/lib/mirror-word.ts (an emoji or a base+mark cluster stays a
// single span; a plain code-unit split would cut it apart).
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export interface GraphemeRole {
  // which half of the center this grapheme is, for the pm-center1/pm-center2
  // brackets; "both" when a lone letter is its own center
  center?: "left" | "right" | "both";
  // inside the span the reading failed to pair
  gap?: boolean;
}

export interface ReaderGrapheme {
  // position in the flat reading order, for stable keys and pivot selection
  index: number;
  value: string;
  role: GraphemeRole;
  // the mirror step this grapheme activates on tap, when it belongs to one
  step: number | undefined;
}

export interface ReaderLine {
  // stable line number, for keys
  id: number;
  graphemes: ReaderGrapheme[];
}

export interface ReaderStep {
  // flat grapheme indexes the step tints, in reading order
  graphemes: number[];
  // the innermost step — always last, and the step the reader opens on Prev
  center: boolean;
  // a lone center: one letter that is its own mirror (an odd-length
  // palindrome). An even palindrome's innermost step is a center *pair*.
  loneCenter: boolean;
}

export interface ReaderAnalysis {
  lines: ReaderLine[];
  // ordered outermost pair -> innermost; the center is last. Empty unless
  // the text reads the same both ways
  steps: ReaderStep[];
  // steps that are pairs: a lone center is not one. What the reader gates its
  // controls on and what the "Pair n of m" label counts
  pairCount: number;
  hasLetters: boolean;
  isPalindrome: boolean;
}

// the reader's current mirror step: `step` indexes `ReaderAnalysis.steps`,
// `pivot` is the flat grapheme index of the selected occurrence
export interface ActiveStep {
  step: number;
  pivot: number;
}

// Builds the model without touching ProseMirror: the shared text is a plain
// string, so no document positions are needed. The verdict still comes from
// the one checker, fed the shared per-code-unit normalization (`normalizedUnits`).
// The reader joins its lines without block separators, where `doc-analysis.ts`
// inserts "\n" between textblocks; a newline is not a letter, so the verdict,
// center and gap are identical.
export const analyzeReaderText = (raw: string): ReaderAnalysis => {
  const lines: ReaderLine[] = [];
  const graphemes: ReaderGrapheme[] = [];
  // normalized text, index-aligned with textGrapheme (the checker's view)
  let normalized = "";
  // normalized text index -> flat grapheme index
  const textGrapheme: number[] = [];

  for (const line of raw.split("\n")) {
    const lineGraphemes: ReaderGrapheme[] = [];
    for (const { segment } of segmenter.segment(line)) {
      const index = graphemes.length + lineGraphemes.length;
      const grapheme: ReaderGrapheme = {
        index,
        value: segment,
        role: {},
        step: undefined,
      };
      lineGraphemes.push(grapheme);
      // normalize by UTF-16 code unit, exactly as doc-analysis.ts does: a
      // character can normalize to nothing (a bare combining mark) or to
      // several units, and only the checker's own view may decide letters
      for (const { units } of normalizedUnits(segment)) {
        for (let i = 0; i < units.length; i++) {
          textGrapheme.push(index);
          normalized += units[i];
        }
      }
    }
    lines.push({ id: lines.length, graphemes: lineGraphemes });
    graphemes.push(...lineGraphemes);
  }

  // letter ordinal by normalized text index, and the reverse per grapheme
  const ordinalAt: Array<number | undefined> = [];
  let letterCount = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (isLetter(normalized[i])) ordinalAt[i] = letterCount++;
  }
  const graphemeOf: number[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const ordinal = ordinalAt[i];
    if (ordinal === undefined) continue;
    graphemeOf[ordinal] = textGrapheme[i];
  }

  const result = checkPalindrome(normalized);

  // letter ordinal -> mirror letter ordinal
  const mirror: Array<number | undefined> = [];
  for (let i = 0; i < normalized.length; i++) {
    const ordinal = ordinalAt[i];
    if (ordinal === undefined) continue;
    const mirrored = result.mirror[i];
    mirror[ordinal] = mirrored === undefined ? undefined : ordinalAt[mirrored];
  }

  if (result.center) {
    const [start, end] = result.center;
    if (start === end) {
      graphemes[textGrapheme[start]].role.center = "both";
    } else {
      graphemes[textGrapheme[start]].role.center = "left";
      graphemes[textGrapheme[end]].role.center = "right";
    }
  }
  // the gap covers punctuation between the outermost disagreeing letters too,
  // so every normalized unit in the range marks its grapheme
  if (result.gap) {
    const [gapStart, gapEnd] = result.gap;
    for (let i = gapStart; i <= gapEnd; i++) {
      graphemes[textGrapheme[i]].role.gap = true;
    }
  }

  // one step per pair, taken on the lower ordinal; a lone center is its own
  // mirror. Sorting by span puts the outermost pair first and the center last.
  const steps: ReaderStep[] = [];
  if (result.isPalindrome && letterCount > 0) {
    const entries: Array<{ ordinals: number[]; span: number }> = [];
    for (let ordinal = 0; ordinal < letterCount; ordinal++) {
      const mirrored = mirror[ordinal];
      if (mirrored === undefined || mirrored < ordinal) continue;
      entries.push({
        ordinals: mirrored === ordinal ? [ordinal] : [ordinal, mirrored],
        span: mirrored - ordinal,
      });
    }
    entries.sort((a, b) => b.span - a.span);

    for (const [stepIndex, entry] of entries.entries()) {
      steps.push({
        graphemes: [...new Set(entry.ordinals.map((ordinal) => graphemeOf[ordinal]))],
        center: stepIndex === entries.length - 1,
        loneCenter: entry.ordinals.length === 1,
      });
      for (const ordinal of entry.ordinals) {
        const grapheme = graphemes[graphemeOf[ordinal]];
        if (grapheme.step === undefined) grapheme.step = stepIndex;
      }
    }
  }

  return {
    lines,
    steps,
    pairCount: steps.filter((step) => !step.loneCenter).length,
    hasLetters: letterCount > 0,
    isPalindrome: result.isPalindrome,
  };
};

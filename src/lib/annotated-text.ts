// app.bsky.richtext.facet indexes are UTF-8 byte offsets, while the text we
// hold (and slice) is UTF-16: accented letters widen under encoding. This
// module is the one owner of that conversion and of the set of text indexes
// an annotation covers — both the extractor and the card build on it.
export interface FacetRange {
  byteStart: number;
  byteEnd: number;
}

export const facetByteRangesToIndices = (
  text: string,
  ranges: readonly FacetRange[],
): Array<[number, number]> => {
  if (ranges.length === 0) return [];
  const encoder = new TextEncoder();
  // the UTF-16 index at the start of each code point, with the byte offset
  // it begins at; the final entry closes the last code point
  const boundaries: Array<{ byte: number; index: number }> = [];
  let byte = 0;
  for (let index = 0; index < text.length;) {
    const codePoint = text.codePointAt(index) ?? 0;
    boundaries.push({ byte, index });
    byte += encoder.encode(String.fromCodePoint(codePoint)).length;
    index += codePoint > 0xffff ? 2 : 1;
  }
  boundaries.push({ byte, index: text.length });

  const toIndex = (target: number): number => {
    let result = 0;
    for (const boundary of boundaries) {
      if (boundary.byte <= target) result = boundary.index;
      else break;
    }
    return result;
  };

  return ranges.map(({ byteStart, byteEnd }) => [toIndex(byteStart), toIndex(byteEnd)]);
};

// the UTF-16 indexes the facet ranges cover, so a consumer that wants to
// skip annotation letters asks this rather than re-walking the conversion
export const facetExclusions = (text: string, ranges: readonly FacetRange[]): Set<number> => {
  const excluded = new Set<number>();
  for (const [start, end] of facetByteRangesToIndices(text, ranges)) {
    for (let index = start; index < end; index++) excluded.add(index);
  }
  return excluded;
};

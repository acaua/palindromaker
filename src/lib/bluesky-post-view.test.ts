import { describe, expect, test } from "vite-plus/test";

import type { FacetRange } from "@/lib/annotated-text";
import { describePost } from "@/lib/bluesky-post-view";
import { makePost } from "@/test/bluesky-post";

const encoder = new TextEncoder();

// the facet range for the first occurrence of `needle` in `text`, in the
// UTF-8 byte offsets Bluesky uses
const rangeOf = (text: string, needle: string): FacetRange => {
  const at = text.indexOf(needle);
  const byteStart = encoder.encode(text.slice(0, at)).length;
  return { byteStart, byteEnd: byteStart + encoder.encode(needle).length };
};

describe("describePost", () => {
  test("extracts the palindrome and splits the annotated text", () => {
    const text = "My palindrome: A man, a plan, a canal: Panama! #palindrome";
    const view = describePost(makePost({ text, facetRanges: [rangeOf(text, "#palindrome")] }));

    expect(view.restricted).toBe(false);
    expect(view.palindrome).toBe("A man, a plan, a canal: Panama!");
    expect(view.segments.map((segment) => segment.annotation)).toEqual([false, true]);
    expect(view.segments[view.segments.length - 1].text).toBe("#palindrome");
  });

  test("a post with no palindrome gets null", () => {
    expect(describePost(makePost({ text: "spoon" })).palindrome).toBeNull();
  });

  test("restricted wins: a restricted post yields no palindrome", () => {
    const view = describePost(
      makePost({ text: "A man, a plan, a canal: Panama", labels: ["porn"] }),
    );

    expect(view.restricted).toBe(true);
    expect(view.palindrome).toBeNull();
  });

  test("uses target-aware moderation modes", () => {
    const authorRestricted = makePost({
      text: "A man, a plan, a canal: Panama",
      author: { ...makePost().author, accountLabels: ["!no-unauthenticated"] },
    });
    expect(describePost(authorRestricted, "loggedOut").restricted).toBe(true);
    expect(describePost(authorRestricted, "accountExplore").restricted).toBe(true);
    expect(describePost(authorRestricted, "hashtagExplore").restricted).toBe(false);
    const profileRestricted = makePost({
      author: { ...makePost().author, profileLabels: ["!no-unauthenticated"] },
    });
    expect(describePost(profileRestricted, "accountExplore").restricted).toBe(true);
    const hidden = makePost({ labels: ["!hide"] });
    expect(describePost(hidden, "hashtagExplore").restricted).toBe(false);
    expect(describePost(hidden, "loggedOut").restricted).toBe(true);
    expect(
      describePost({ ...authorRestricted, labels: ["porn"] }, "accountExplore").restricted,
    ).toBe(true);
  });
});

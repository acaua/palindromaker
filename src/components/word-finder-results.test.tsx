import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ResultRow } from "@/components/word-finder-results";
import { buildDictionary, mirrorMatch } from "@/lib/dictionary";
import type { MirrorMatch } from "@/lib/dictionary";

// "amor" mirrors to "roma", also a word; "ovo" mirrors to itself; "casa"
// mirrors to nothing
const dictionary = buildDictionary(["ovo", "amor", "roma", "casa"].join("\n"));

const renderRow = (word: string, match: MirrorMatch = null) =>
  render(
    <ResultRow word={word} match={match} index={2} total={9} offset={64} />,
  );

const row = () => screen.getByRole("listitem");

describe("ResultRow", () => {
  test("shows the word and its mirror", () => {
    renderRow("casa", mirrorMatch(dictionary, "casa"));

    expect(row().textContent).toBe("casaasac");
    // no marker: nothing announced beyond the two spellings
    expect(row().querySelector(".sr-only")).toBeNull();
    expect(row().querySelector("svg")).toBeNull();
  });

  test("names the marker for a mirror that is also a word", () => {
    renderRow("amor", mirrorMatch(dictionary, "amor"));

    expect(row().textContent).toBe("amorroma (mirror is also a word)");
    expect(row().querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  test("names the marker for a word that mirrors to itself", () => {
    renderRow("ovo", mirrorMatch(dictionary, "ovo"));

    expect(row().textContent).toBe("ovoovo (palindrome word)");
  });

  test("places the row in the full result set, not just the rendered slice", () => {
    renderRow("casa");

    // the list only renders the rows in view, so each one has to say where
    // it sits among all the results
    expect(row().getAttribute("aria-posinset")).toBe("3");
    expect(row().getAttribute("aria-setsize")).toBe("9");
    expect(row().getAttribute("style")).toContain("translateY(64px)");
  });
});

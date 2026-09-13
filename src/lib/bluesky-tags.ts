import { normalizeText } from "@/lib/check-palindrome";
import type { UiLanguage } from "@/lib/i18n";

// tags are matched case/accent-insensitively, the same normalization the
// palindrome checker uses
export const normalizeTag = (tag: string): string => normalizeText(tag);

// The accent-aware spellings the Explore page searches, per UI language.
// Bluesky's search treats an accented hashtag as distinct from its
// unaccented twin, so every tag is expanded to include both forms (see
// withUnaccented). A language's set is joined into one OR query, so a page
// load is a single request — Bluesky throttles bursts and refuses cursor
// paging without auth.
const BASE_TAGS: Record<UiLanguage, readonly string[]> = {
  pt: ["palíndromo"],
  en: ["palindrome"],
  es: ["palíndromo"],
  de: ["palindrom"],
  fr: ["palindrome"],
  it: ["palindromo"],
};

// each tag plus its accent-stripped twin, deduped and order-preserving
const withUnaccented = (tags: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    for (const variant of [tag, normalizeTag(tag)]) {
      if (!seen.has(variant)) {
        seen.add(variant);
        out.push(variant);
      }
    }
  }
  return out;
};

export const PALINDROME_TAGS: Record<UiLanguage, readonly string[]> = {
  pt: withUnaccented(BASE_TAGS.pt),
  en: withUnaccented(BASE_TAGS.en),
  es: withUnaccented(BASE_TAGS.es),
  de: withUnaccented(BASE_TAGS.de),
  fr: withUnaccented(BASE_TAGS.fr),
  it: withUnaccented(BASE_TAGS.it),
};

export const tagsFor = (lang: UiLanguage): readonly string[] => PALINDROME_TAGS[lang];

// Bluesky search has no boolean OR and is accent-sensitive, so a tag is
// its own query; the caller issues one request per tag and merges.
export const tagQuery = (tag: string): string => `#${tag}`;

// search can return posts that merely mention the word, so a result is
// kept only when one of its facet tags is actually in the wanted set
export const isTaggedWith = (
  post: { tags: readonly string[] },
  tags: readonly string[],
): boolean => {
  const wanted = new Set(tags.map(normalizeTag));
  return post.tags.some((tag) => wanted.has(normalizeTag(tag)));
};

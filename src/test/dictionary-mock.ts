import { vi } from "vite-plus/test";
import type * as dictionary from "@/lib/dictionary";

// The word list the editor tests settle the finder with: small and fixed, so
// the panel reaches a deterministic state without fetching megabytes.
export const TEST_DICTIONARY = "ovo\nnada\n";

// The shared `vi.mock("@/lib/dictionary")` body: the real module with only the
// network-backed loader replaced. The caller passes the module from
// `importOriginal`, so this helper never imports the intercepted specifier
// itself (which would recurse into the mock).
export const withTestDictionary = (actual: typeof dictionary) => ({
  ...actual,
  loadDictionary: vi.fn(async () => actual.buildDictionary(TEST_DICTIONARY)),
});

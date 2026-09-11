import type { TextWriter } from "@/lib/clipboard";

// clipboardOrNull reads navigator.clipboard at click time, so tests can
// swap the global instead of threading a stub through props
export const stubClipboard = (writeText: TextWriter["writeText"]): void => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
};

import { useCallback, useEffect, useRef, useState } from "react";

import { clipboardOrNull, copyText } from "@/lib/clipboard";

// The one transient "Copied!" flag every copy action shares: the hook owns
// the 2s timer and the failed-write silence (a blocked write shows
// nothing), the caller renders the label and its sr-only live region.
export const useCopyFeedback = () => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = useCallback((text: string) => {
    void copyText(clipboardOrNull(), text).then((ok) => {
      if (!ok) return;
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return { copied, copy };
};

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { clipboardOrNull, copyText } from "@/lib/clipboard";

// one transient "Copied!" feedback for every copy action in the app: the
// visible label swaps for sighted users and a polite live region announces
// it for screen readers — a renamed button is not announced on its own
export default function CopyButton({
  label,
  title,
  copiedLabel,
  getText,
  icon,
  disabled = false,
}: {
  label: string;
  title: string;
  copiedLabel: string;
  // read at click time, so the caller builds the payload without it
  // running on every render
  getText: () => string;
  icon: ReactNode;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const onCopy = () => {
    void copyText(clipboardOrNull(), getText()).then((ok) => {
      if (!ok) return;
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={title}
        onClick={onCopy}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium ${
          disabled
            ? "cursor-not-allowed text-gray-400"
            : "cursor-pointer text-gray-700 hover:bg-gray-100"
        }`}
      >
        {icon}
        {copied ? copiedLabel : label}
      </button>
      {copied && (
        <span role="status" className="sr-only">
          {copiedLabel}
        </span>
      )}
    </>
  );
}

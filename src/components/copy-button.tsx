import type { ReactNode } from "react";

import { useCopyFeedback } from "@/hooks/use-copy-feedback";

// the one "Copied!" live region, shared by CopyButton and the Share
// dropdown's trigger: a renamed control is not announced on its own
export const CopyStatus = ({ label }: { label: string }) => (
  <span role="status" className="sr-only">
    {label}
  </span>
);

// one transient "Copied!" feedback for every copy action in the app: the
// visible label swaps for sighted users and a polite role="status" live
// region announces it for screen readers — a renamed button is not
// announced on its own
export default function CopyButton({
  label,
  title,
  copiedLabel,
  getText,
  icon,
  disabled = false,
  className = "",
}: {
  label: string;
  title: string;
  copiedLabel: string;
  // read at click time, so the caller builds the payload without it
  // running on every render
  getText: () => string;
  icon: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const { copied, copy } = useCopyFeedback();

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={title}
        onClick={() => copy(getText())}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium ${
          disabled
            ? "cursor-not-allowed text-gray-400"
            : "cursor-pointer text-gray-700 hover:bg-gray-100"
        } ${className}`}
      >
        {icon}
        {copied ? copiedLabel : label}
      </button>
      {copied && <CopyStatus label={copiedLabel} />}
    </>
  );
}

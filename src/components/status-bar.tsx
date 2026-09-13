import { useLayoutEffect } from "react";
import type { ReactNode, RefObject } from "react";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import { CopyStatus } from "@/components/copy-button";
import { planBlueskyShare } from "@/lib/bluesky-share";
import type { EditorFacts } from "@/lib/editor-facts";
import { buildShareUrl } from "@/lib/share-link";
import { useI18n } from "@/hooks/use-i18n";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useDisclosure } from "@/hooks/use-disclosure";

// the card's footer: what the text is now, and the three controls. It is
// presentational — the editor state arrives as `facts`, so it can be tested
// without ProseMirror and the derivation lives in editor-facts.ts.
export default function StatusBar({
  facts,
  onToggleMirror,
  finderOpen,
  onToggleFinder,
  triggerRef,
}: {
  facts: EditorFacts;
  onToggleMirror: () => void;
  finderOpen: boolean;
  onToggleFinder: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 md:justify-between md:px-5">
      <StatusState hasLetters={facts.hasLetters} isPalindrome={facts.isPalindrome} />
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <MirrorSwitch enabled={facts.mirrorEnabled} onToggle={onToggleMirror} />
        <span aria-hidden="true" className="h-4 w-px bg-gray-200" />
        <ShareMenu facts={facts} />
        <span aria-hidden="true" className="h-4 w-px bg-gray-200" />
        <FindWordsTrigger ref={triggerRef} expanded={finderOpen} onToggle={onToggleFinder} />
      </div>
    </div>
  );
}

// the Bluesky butterfly (simple-icons), decorative beside the label
const BlueskyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026" />
  </svg>
);

// one row inside the share menu
const MenuAction = ({
  icon,
  onClick,
  disabled = false,
  title,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    onClick={onClick}
    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium ${
      disabled
        ? "cursor-not-allowed text-gray-400"
        : "cursor-pointer text-gray-700 hover:bg-gray-50"
    }`}
  >
    <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
      {icon}
    </span>
    {children}
  </button>
);

// The Share control: one disclosure that copies the text, copies the /p
// link, or opens Bluesky's composer. It is position:fixed so the card's
// overflow-hidden cannot clip it; it follows the trigger on scroll and
// flips below when there is no room above.
const ShareMenu = ({ facts }: { facts: EditorFacts }) => {
  const { t } = useI18n();
  const { copied, copy } = useCopyFeedback();
  const { open, toggle, close, triggerRef, panelRef, panelId } = useDisclosure();
  const { raw, shareable, overLimit } = facts;
  // built here, not in the facts: it needs the impure origin and a grapheme
  // count, and the post is only worth planning once the text is shareable
  const blueskyUrl = shareable
    ? (planBlueskyShare(raw, location.origin)?.composeUrl ?? null)
    : null;

  // Place the fixed panel above the trigger, or below when it would not fit,
  // and keep it anchored on scroll. Written straight to the node: the
  // position is layout, not state.
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;
    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const margin = 8;
      panel.style.right = `${Math.max(margin, window.innerWidth - rect.right)}px`;
      const fitsAbove = rect.top >= panel.getBoundingClientRect().height + margin;
      if (fitsAbove) {
        panel.style.bottom = `${window.innerHeight - rect.top + margin}px`;
        panel.style.top = "";
      } else {
        panel.style.top = `${rect.bottom + margin}px`;
        panel.style.bottom = "";
      }
      panel.style.visibility = "visible";
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open, panelRef, triggerRef]);

  const triggerTitle = shareable
    ? t("share.title")
    : overLimit
      ? t("share.tooLong")
      : t("share.disabled");
  // when the menu is open, shareable is true, so a missing URL means too long
  const postDisabled = blueskyUrl === null;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={!shareable}
        title={triggerTitle}
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium ${
          shareable
            ? "cursor-pointer text-gray-700 hover:bg-gray-100"
            : "cursor-not-allowed text-gray-400"
        }`}
      >
        <LinkIcon aria-hidden="true" className="h-4 w-4 text-gray-500" />
        {copied ? t("share.copied") : t("share.label")}
        <ChevronDownIcon aria-hidden="true" className="h-3 w-3 text-gray-400" />
      </button>
      {copied && <CopyStatus label={t("share.copied")} />}
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        style={{ position: "fixed", visibility: "hidden" }}
        className="z-30 w-48 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]"
      >
        <MenuAction
          icon={<ClipboardDocumentIcon className="h-4 w-4 text-gray-500" />}
          onClick={() => {
            close(true);
            copy(raw);
          }}
          title={t("share.copyText")}
        >
          {t("share.copyText")}
        </MenuAction>
        <MenuAction
          icon={<LinkIcon className="h-4 w-4 text-gray-500" />}
          onClick={() => {
            close(true);
            copy(buildShareUrl(raw, location.origin));
          }}
          title={t("share.copyLink")}
        >
          {t("share.copyLink")}
        </MenuAction>
        <MenuAction
          icon={<BlueskyIcon className={`h-4 w-4 ${blueskyUrl ? "text-[#0285FF]" : ""}`} />}
          onClick={() => {
            close(true);
            if (blueskyUrl) window.open(blueskyUrl, "_blank", "noopener,noreferrer");
          }}
          disabled={postDisabled}
          title={postDisabled ? t("bluesky.tooLong") : t("bluesky.title")}
        >
          {t("bluesky.label")}
        </MenuAction>
      </div>
    </>
  );
};

const FindWordsTrigger = ({
  ref,
  expanded,
  onToggle,
}: {
  ref: RefObject<HTMLButtonElement | null>;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const { t } = useI18n();
  return (
    <button
      type="button"
      ref={ref}
      aria-expanded={expanded}
      aria-controls="word-finder-panel"
      title={t("findWords")}
      onClick={onToggle}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
    >
      <MagnifyingGlassIcon aria-hidden="true" className="h-4 w-4 text-gray-500" />
      {t("findWords")}
    </button>
  );
};

const MirrorSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-pressed={enabled}
      // the extension remembers the new state across reloads
      onClick={onToggle}
      // keep the editor focus (and caret) when toggling
      onMouseDown={(event) => event.preventDefault()}
      title={enabled ? t("mirror.on") : t("mirror.off")}
      className="flex cursor-pointer items-center gap-2"
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-11 items-center rounded-full p-0.5 shadow-inner transition-colors ${
          enabled ? "bg-violet-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "ml-auto" : ""}`}
        />
      </span>
      <span className="text-sm font-medium text-gray-700">{t("mirror.typing")}</span>
    </button>
  );
};

const StatusState = ({
  hasLetters,
  isPalindrome,
}: {
  hasLetters: boolean;
  isPalindrome: boolean;
}) => {
  const { t } = useI18n();
  const label = !hasLetters
    ? t("status.startTyping")
    : isPalindrome
      ? t("status.palindrome")
      : t("status.notPalindrome");

  return (
    <span
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 text-sm font-medium ${
        !hasLetters ? "text-gray-500" : isPalindrome ? "text-green-700" : "text-red-700"
      }`}
    >
      {!hasLetters ? (
        <span aria-hidden="true" className="h-4 w-4 rounded-full bg-gray-300" />
      ) : isPalindrome ? (
        <CheckCircleIcon aria-hidden="true" className="h-4 w-4" />
      ) : (
        <XCircleIcon aria-hidden="true" className="h-4 w-4" />
      )}
      {label}
    </span>
  );
};

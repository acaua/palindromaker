import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { RefObject } from "react";
import {
  CheckCircleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import CopyButton from "@/components/copy-button";
import { mirrorPluginKey } from "@/lib/mirror-extension";
import { palindromePluginKey } from "@/lib/palindrome-extension";
import { MAX_SHARE_TEXT, buildShareUrl } from "@/lib/share-link";
import { useI18n } from "@/hooks/use-i18n";

// the card's footer: what the text is now, and the three controls
export default function StatusBar({
  editor,
  finderOpen,
  onToggleFinder,
  triggerRef,
}: {
  editor: Editor;
  finderOpen: boolean;
  onToggleFinder: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { hasLetters, isPalindrome, mirrorEnabled, shareable, overLimit } = useEditorState({
    editor,
    selector: ({ editor }) => {
      const analysis = palindromePluginKey.getState(editor.state)?.analysis;
      const hasLetters = (analysis?.letterPositions.length ?? 0) > 0;
      const isPalindrome = analysis?.result.isPalindrome ?? false;
      return {
        hasLetters,
        isPalindrome,
        mirrorEnabled: mirrorPluginKey.getState(editor.state)?.enabled ?? false,
        // hasLetters, because an empty document is vacuously a palindrome;
        // the cap rides the analysis's normalized text (already in plugin
        // state) instead of a second getText walk per keystroke — the
        // reader's decode cap is the gate that really binds
        shareable: hasLetters && isPalindrome && (analysis?.text.length ?? 0) <= MAX_SHARE_TEXT,
        overLimit: (analysis?.text.length ?? 0) > MAX_SHARE_TEXT,
      };
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 md:px-5">
      <StatusState hasLetters={hasLetters} isPalindrome={isPalindrome} />
      <div className="flex items-center gap-2.5">
        <MirrorSwitch editor={editor} enabled={mirrorEnabled} />
        <span aria-hidden="true" className="h-4 w-px bg-gray-200" />
        <ShareButton editor={editor} shareable={shareable} overLimit={overLimit} />
        <span aria-hidden="true" className="h-4 w-px bg-gray-200" />
        <FindWordsTrigger ref={triggerRef} expanded={finderOpen} onToggle={onToggleFinder} />
      </div>
    </div>
  );
}

const ShareButton = ({
  editor,
  shareable,
  overLimit,
}: {
  editor: Editor;
  shareable: boolean;
  overLimit: boolean;
}) => {
  const { t } = useI18n();
  return (
    <CopyButton
      disabled={!shareable}
      label={t("share.label")}
      title={!shareable ? (overLimit ? t("share.tooLong") : t("share.disabled")) : t("share.title")}
      copiedLabel={t("share.copied")}
      icon={<LinkIcon aria-hidden="true" className="h-4 w-4 text-gray-500" />}
      getText={() => buildShareUrl(editor.getText({ blockSeparator: "\n" }), location.origin)}
    />
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

const MirrorSwitch = ({ editor, enabled }: { editor: Editor; enabled: boolean }) => {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-pressed={enabled}
      // the extension remembers the new state across reloads
      onClick={() => editor.commands.toggleMirrorEditing()}
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

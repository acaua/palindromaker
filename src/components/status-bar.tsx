import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { RefObject } from "react";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import { mirrorPluginKey } from "@/lib/mirror-extension";
import { palindromePluginKey } from "@/lib/palindrome-extension";

// the card's footer: what the text is now, and the two controls
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
  const { hasLetters, isPalindrome, mirrorEnabled } = useEditorState({
    editor,
    selector: ({ editor }) => {
      const palindrome = palindromePluginKey.getState(editor.state);
      return {
        hasLetters: palindrome?.hasLetters ?? false,
        isPalindrome: palindrome?.isPalindrome ?? false,
        mirrorEnabled: mirrorPluginKey.getState(editor.state)?.enabled ?? false,
      };
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 md:px-5">
      <StatusState hasLetters={hasLetters} isPalindrome={isPalindrome} />
      <div className="flex items-center gap-2.5">
        <MirrorSwitch editor={editor} enabled={mirrorEnabled} />
        <span aria-hidden="true" className="h-4 w-px bg-gray-200" />
        <FindWordsTrigger
          ref={triggerRef}
          expanded={finderOpen}
          onToggle={onToggleFinder}
        />
      </div>
    </div>
  );
}

const FindWordsTrigger = ({
  ref,
  expanded,
  onToggle,
}: {
  ref: RefObject<HTMLButtonElement | null>;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    ref={ref}
    aria-expanded={expanded}
    aria-controls="word-finder-panel"
    title="Find words"
    onClick={onToggle}
    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
  >
    <MagnifyingGlassIcon aria-hidden="true" className="h-4 w-4 text-gray-500" />
    Find words
  </button>
);

const MirrorSwitch = ({
  editor,
  enabled,
}: {
  editor: Editor;
  enabled: boolean;
}) => (
  <button
    type="button"
    aria-pressed={enabled}
    // the extension remembers the new state across reloads
    onClick={() => editor.commands.toggleMirrorEditing()}
    // keep the editor focus (and caret) when toggling
    onMouseDown={(event) => event.preventDefault()}
    title={enabled ? "Mirror typing is on" : "Mirror typing is off"}
    className="flex cursor-pointer items-center gap-2"
  >
    <span
      aria-hidden="true"
      className={`flex h-6 w-11 items-center rounded-full p-0.5 shadow-inner transition-colors ${
        enabled ? "bg-violet-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow transition ${
          enabled ? "ml-auto" : ""
        }`}
      />
    </span>
    <span className="text-sm font-medium text-gray-700">Mirror typing</span>
  </button>
);

const StatusState = ({
  hasLetters,
  isPalindrome,
}: {
  hasLetters: boolean;
  isPalindrome: boolean;
}) => {
  const label = !hasLetters
    ? "Start typing"
    : isPalindrome
      ? "Palindrome"
      : "Not a palindrome";

  return (
    <span
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 text-sm font-medium ${
        !hasLetters
          ? "text-gray-500"
          : isPalindrome
            ? "text-green-700"
            : "text-red-700"
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

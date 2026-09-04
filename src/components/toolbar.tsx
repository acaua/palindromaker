import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import { mirrorPluginKey } from "@/lib/mirror-extension";
import { palindromePluginKey } from "@/lib/palindrome-extension";
import { writePrefs } from "@/lib/persistence";

export default function Toolbar({ editor }: { editor: Editor }) {
  const { hasLetters, isPalindrome, mirrorEnabled } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      hasLetters: /\p{L}/u.test(editor.state.doc.textContent),
      isPalindrome:
        palindromePluginKey.getState(editor.state)?.isPalindrome ?? false,
      mirrorEnabled: mirrorPluginKey.getState(editor.state)?.enabled ?? false,
    }),
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <IsPalindrome hasLetters={hasLetters} isPalindrome={isPalindrome} />
      <MirrorEditingToggle editor={editor} enabled={mirrorEnabled} />
    </div>
  );
}

const MirrorEditingToggle = ({
  editor,
  enabled,
}: {
  editor: Editor;
  enabled: boolean;
}) => (
  <button
    type="button"
    aria-pressed={enabled}
    onClick={() => {
      editor.commands.toggleMirrorEditing();
      // remember the new state across reloads
      writePrefs(localStorage, { mirrorEnabled: !enabled });
    }}
    // keep the editor focus (and caret) when toggling
    onMouseDown={(event) => event.preventDefault()}
    title="Automatically insert and remove the matching letter on the other side"
    className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3 py-2 text-sm font-medium transition ${
      enabled
        ? "border-violet-200 bg-violet-100 text-violet-800 shadow-sm"
        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`}
  >
    <ArrowsRightLeftIcon className="mr-2 inline-block h-5 w-5" />
    Mirror typing
    <span
      className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        enabled ? "bg-violet-200 text-violet-900" : "bg-gray-100 text-gray-600"
      }`}
    >
      {enabled ? "on" : "off"}
    </span>
  </button>
);

const IsPalindrome = ({
  hasLetters,
  isPalindrome,
}: {
  hasLetters: boolean;
  isPalindrome: boolean;
}) => {
  const classNameIcon = "inline-block h-5 w-5 mr-2";
  const label = !hasLetters
    ? "Start typing"
    : isPalindrome
      ? "Palindrome"
      : "Not a palindrome";

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold ${
        !hasLetters
          ? "bg-gray-100 text-gray-600"
          : isPalindrome
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
      }`}
    >
      {!hasLetters ? (
        <span
          aria-hidden="true"
          className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-gray-400"
        />
      ) : isPalindrome ? (
        <CheckCircleIcon
          aria-hidden="true"
          className={`${classNameIcon} text-green-700`}
        />
      ) : (
        <XCircleIcon
          aria-hidden="true"
          className={`${classNameIcon} text-red-700`}
        />
      )}
      {label}
    </span>
  );
};

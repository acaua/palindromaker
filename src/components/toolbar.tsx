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
  const { isPalindrome, mirrorEnabled } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isPalindrome:
        palindromePluginKey.getState(editor.state)?.isPalindrome ?? false,
      mirrorEnabled: mirrorPluginKey.getState(editor.state)?.enabled ?? false,
    }),
  });

  return (
    <div className="flex items-center p-2 border-b-2 border-gray-200">
      <IsPalindrome isPalindrome={isPalindrome} />
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
    className={`ml-2 inline-flex cursor-pointer items-center rounded-sm px-2 py-1 ${
      enabled ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
    }`}
  >
    <ArrowsRightLeftIcon className="mr-1 inline-block h-6 w-6" />
    mirror
  </button>
);

const IsPalindrome = ({ isPalindrome }: { isPalindrome: boolean }) => {
  const classNameIcon = "inline-block h-6 w-6 mr-1";
  return (
    <span
      role="status"
      aria-live="polite"
      className={`px-2 py-1 rounded-sm ${
        isPalindrome ? "bg-green-100" : "bg-red-100"
      }`}
    >
      {isPalindrome ? (
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
      palindrome
      <span className="sr-only">{isPalindrome ? "yes" : "no"}</span>
    </span>
  );
};

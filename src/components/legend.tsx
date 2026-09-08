import {
  ArrowsRightLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

const item = "flex items-center gap-1.5";
const swatch = "inline-block h-3 w-3 shrink-0 rounded-sm";
const icon = "h-3 w-3 shrink-0";

// the markers the word finder puts next to each result
export function FinderLegend() {
  return (
    <footer
      aria-label="word finder legend"
      className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 px-4 py-3 text-xs text-gray-500"
    >
      <span className={item}>
        <ArrowsRightLeftIcon
          aria-hidden="true"
          className={`${icon} text-purple-700`}
        />
        mirror is also a word
      </span>
      <span className={item}>
        <CheckCircleIcon
          aria-hidden="true"
          className={`${icon} text-green-700`}
        />
        palindrome word
      </span>
    </footer>
  );
}

// the colors the editor highlights characters with
export function EditorLegend() {
  return (
    <footer
      aria-label="editor legend"
      className="flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:text-sm"
    >
      <span className={item}>
        <span aria-hidden="true" className={`${swatch} bg-blue-200`} />
        center of the palindrome
      </span>
      <span className={item}>
        <span aria-hidden="true" className={`${swatch} bg-red-300`} />
        breaks the palindrome
      </span>
      <span className={item}>
        <span aria-hidden="true" className={`${swatch} bg-purple-400`} />
        mirror of your caret
      </span>
    </footer>
  );
}

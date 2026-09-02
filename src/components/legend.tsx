import {
  ArrowsRightLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

const item = "flex items-center gap-1.5";
const swatch = "inline-block h-3 w-3 shrink-0 rounded-sm";
const icon = "h-3 w-3 shrink-0";

// explains the editor highlight colors and the word finder markers;
// swatch classes match the actual highlights (and the e2e suite scopes
// its decoration assertions to the editor because of that)
export default function Legend() {
  return (
    <footer
      aria-label="legend"
      className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-2 text-sm text-gray-500"
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

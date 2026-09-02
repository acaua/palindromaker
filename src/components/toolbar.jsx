import { useSlate } from "slate-react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/solid";

export default function Toolbar() {
  const editor = useSlate();

  const { isPalindrome } = editor.palindrome;

  return (
    <div className="flex items-center p-2 border-b-2 border-gray-200">
      <IsPalindrome isPalindrome={isPalindrome} />
    </div>
  );
}

const IsPalindrome = ({ isPalindrome }) => {
  const classNameIcon = "inline-block h-6 w-6 mr-1";
  return (
    <span
      className={`px-2 py-1 rounded-sm ${
        isPalindrome ? "bg-green-100" : "bg-red-100"
      }`}
    >
      {isPalindrome ? (
        <CheckCircleIcon className={`${classNameIcon} text-green-700`} />
      ) : (
        <XCircleIcon className={`${classNameIcon} text-red-700`} />
      )}
      palindrome
    </span>
  );
};

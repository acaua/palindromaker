import type { BaseEditor, BaseRange, BaseText, Descendant, Point } from "slate";
import type { ReactEditor } from "slate-react";

export type PalindromeMark = "center1" | "center2" | "gap" | "self" | "mirror";

export interface PalindromeInfo {
  isPalindrome: boolean;
  center: Point[] | undefined;
  mirror: Array<[Point, Point] | undefined>;
}

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor &
      ReactEditor & {
        palindrome: PalindromeInfo;
      };
    Element: {
      type: string;
      children: Descendant[];
    };
    Text: BaseText & Partial<Record<PalindromeMark, boolean>>;
    Range: BaseRange & Partial<Record<PalindromeMark, boolean>>;
  }
}

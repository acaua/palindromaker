import { ArrowsRightLeftIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

import type { MirrorMatch } from "@/lib/dictionary";
import type { MessageKey } from "@/lib/i18n";

export type MarkerKind = Exclude<MirrorMatch, null>;

// the icon, colour and label of one marker, named so a row and the legend
// pass the same shape rather than a bare triple
export interface MirrorMatchMarker {
  Icon: typeof ArrowsRightLeftIcon;
  className: string;
  key: MessageKey;
}

// The one owner of how a finder result's mirror is marked. The legend under
// the panel and each result row both read it, so a wording or contrast fix
// lands in one place instead of drifting between the two.
export const MIRROR_MATCH_MARKERS: Record<MarkerKind, MirrorMatchMarker> = {
  pair: {
    Icon: ArrowsRightLeftIcon,
    className: "text-purple-700",
    key: "legend.pair",
  },
  palindrome: {
    Icon: CheckCircleIcon,
    className: "text-green-700",
    key: "legend.palindromeWord",
  },
};

// the legend's order, explicit so reordering the record cannot reorder it
export const MIRROR_MATCH_ORDER: readonly MarkerKind[] = ["pair", "palindrome"];

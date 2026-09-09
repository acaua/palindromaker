import type { MessageKey } from "@/lib/i18n";

// the site header's pages, in order. The header maps over this table, so a
// future page is one entry here plus one route in src/router.tsx. Plain
// data, like the i18n tables, so src/lib/ stays React-free.
export type NavEntry = {
  path: "/" | "/about";
  labelKey: MessageKey;
};

export const NAV_ENTRIES: readonly NavEntry[] = [
  { path: "/", labelKey: "nav.home" },
  { path: "/about", labelKey: "nav.about" },
];

import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/hooks/use-i18n";
import { NAV_ENTRIES } from "@/lib/navigation";
import type { NavEntry } from "@/lib/navigation";

const desktopLinkClass = (active: boolean) =>
  `text-sm ${active ? "font-semibold text-violet-700" : "font-medium text-gray-600 transition hover:text-gray-900"}`;

const panelLinkClass = (active: boolean) =>
  `rounded-lg px-3 py-2.5 text-sm ${active ? "bg-violet-50 font-semibold text-violet-700" : "font-medium text-gray-700 transition hover:bg-gray-50"}`;

// the brand goes home; the page's visible name lives in the header, not in
// a heading, so each page carries its own h1
const BrandLink = ({ compact = false }: { compact?: boolean }) => (
  <Link
    to="/"
    className={`flex items-center gap-2 font-bold tracking-tight text-gray-900 ${
      compact ? "text-xl" : "text-2xl"
    }`}
  >
    <span
      aria-hidden="true"
      className={`font-bold text-violet-600 ${compact ? "text-2xl" : "text-3xl"}`}
    >
      ↔
    </span>
    Palindromaker
  </Link>
);

const NavLink = ({
  entry,
  pathname,
  className,
  onClick,
}: {
  entry: NavEntry;
  pathname: string;
  className: (active: boolean) => string;
  onClick?: () => void;
}) => {
  const { t } = useI18n();
  const active = pathname === entry.path;
  return (
    <Link
      to={entry.path}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={className(active)}
    >
      {t(entry.labelKey)}
    </Link>
  );
};

// the phone menu: the ☰ button and the panel with the links and the
// language select. Mounted keyed by the route, so any navigation remounts
// it closed — no effect has to watch the route to reset the state.
const MobileMenu = ({ pathname }: { pathname: string }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const panelId = useId();

  // Esc closes and hands focus back to the button, per the disclosure
  // pattern — keyboard users are not dropped where the panel used to be
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // a click outside the nav closes it; where focus lands is the click's
  // business, so nothing is refocused here
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        navRef.current &&
        event.target instanceof Node &&
        !navRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <nav aria-label={t("nav.aria")} ref={navRef} className="md:hidden">
      <div className="flex h-14 w-full items-center gap-3 px-4">
        <BrandLink compact />
        <button
          type="button"
          ref={buttonRef}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={t("nav.menu")}
          title={t("nav.menu")}
          onClick={() => setOpen(!open)}
          className="ml-auto inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
        >
          {open ? (
            <XMarkIcon aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Bars3Icon aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </div>
      <div
        id={panelId}
        hidden={!open}
        className="border-b border-gray-200 bg-white px-4 pb-4 pt-2 shadow-lg"
      >
        <div className="flex flex-col">
          {NAV_ENTRIES.map((entry) => (
            <NavLink
              key={entry.path}
              entry={entry}
              pathname={pathname}
              className={panelLinkClass}
              // same-page clicks leave the route unchanged, so the link
              // itself has to close the panel
              onClick={() => setOpen(false)}
            />
          ))}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3">
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
};

// the site's navigation bar: sticky, brand left, links and the language
// select right. On phones the links and the select collapse into the menu
// panel, opened from the ☰ button.
export default function SiteHeader() {
  const { t } = useI18n();
  const pathname = useRouterState({
    select: ({ location }) => location.pathname,
  });

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur">
      <nav
        aria-label={t("nav.aria")}
        className="mx-auto hidden h-14 w-full max-w-5xl items-center gap-6 px-5 md:flex"
      >
        <BrandLink />
        <div className="ml-auto flex items-center gap-5">
          {NAV_ENTRIES.map((entry) => (
            <NavLink
              key={entry.path}
              entry={entry}
              pathname={pathname}
              className={desktopLinkClass}
            />
          ))}
          <LanguageSwitcher />
        </div>
      </nav>

      <MobileMenu key={pathname} pathname={pathname} />
    </header>
  );
}

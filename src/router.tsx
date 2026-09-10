import { useEffect, useRef } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";

import AboutPage from "@/components/about-page";
import EditorPage from "@/components/editor-page";
import SiteHeader from "@/components/site-header";
import { countRoute } from "@/lib/goatcounter";

// the shell every route renders inside: the sticky header plus the routed
// page. The router owns the chrome, pages own their content.
const RootLayout = () => {
  const pathname = useRouterState({
    select: ({ location }) => location.pathname,
  });
  // the first run is the page load itself: a reload keeps the browser's
  // scroll restoration (and focus) instead of being reset by this effect
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // a long palindrome can leave the window scrolled deep; a fresh page
    // starts at the top instead of wherever the previous one was reading
    window.scrollTo(0, 0);
    // the route swap and the menu remount drop focus; the page's h1 takes
    // it so screen readers announce the new page — unless the page manages
    // its own focus (the editor autofocuses on mount)
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.isContentEditable) return;
    document.querySelector<HTMLElement>("main h1")?.focus();
  }, [pathname]);

  // one GoatCounter pageview per route, the first included: the script is
  // told no_onload, so nothing counts by itself (see lib/goatcounter.ts)
  useEffect(() => {
    countRoute(pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Outlet />
    </div>
  );
};

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: EditorPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});

export const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

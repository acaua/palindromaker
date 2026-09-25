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
import ExplorePage from "@/components/explore-page";
import ReaderPage from "@/components/reader-page";
import SiteHeader from "@/components/site-header";
import { countRoute } from "@/lib/goatcounter";
import { validateExploreSearch } from "@/lib/explore-search";
import { resetPageView } from "@/lib/page-focus";

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
    resetPageView();
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

const readerRoute = createRoute({
  getParentRoute: () => rootRoute,
  // a destination, not a browsable page: it is reached through shared
  // links, so it stays out of NAV_ENTRIES
  path: "/p",
  component: ReaderPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  component: ExplorePage,
  validateSearch: validateExploreSearch,
});

export const routeTree = rootRoute.addChildren([indexRoute, readerRoute, aboutRoute, exploreRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { AnyRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

type RenderWithRouterOptions = {
  routeTree: AnyRoute;
  initialEntry?: string;
};

export const renderWithRouter = ({
  routeTree,
  initialEntry = "/",
}: RenderWithRouterOptions): RenderResult => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  return render(<RouterProvider router={router} />);
};

export const renderAtExplore = (ui: ReactElement): RenderResult => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const exploreRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/explore",
    component: () => ui,
  });
  const pRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/p",
    component: () => null,
  });

  return renderWithRouter({
    routeTree: rootRoute.addChildren([exploreRoute, pRoute]),
    initialEntry: "/explore",
  });
};

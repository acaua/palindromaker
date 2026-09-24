import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import type { AnyRoute } from "@tanstack/react-router";

type RenderWithRouterOptions = {
  routeTree: AnyRoute;
  initialPath?: string;
};

export const renderWithRouter = ({
  routeTree,
  initialPath = "/",
}: RenderWithRouterOptions): RenderResult => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  return render(<RouterProvider router={router} />);
};

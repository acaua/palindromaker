import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { createQueryClient } from "@/queries/query-client";

export const createTestQueryClient = () => createQueryClient();

export const TestQueryClientProvider = ({
  children,
  client,
}: {
  children: ReactNode;
  client: ReturnType<typeof createTestQueryClient>;
}) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

export const queryWrapper = (client: ReturnType<typeof createTestQueryClient>) => {
  return ({ children }: { children: ReactNode }) => (
    <TestQueryClientProvider client={client}>{children}</TestQueryClientProvider>
  );
};

export const renderWithQuery = (ui: ReactElement): RenderResult =>
  render(<TestQueryClientProvider client={createTestQueryClient()}>{ui}</TestQueryClientProvider>);

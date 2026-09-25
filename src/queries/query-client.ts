import { QueryClient } from "@tanstack/react-query";

export const REMOTE_STALE_TIME = 5 * 60_000;
export const REMOTE_GC_TIME = 30 * 60_000;

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        gcTime: REMOTE_GC_TIME,
      },
    },
  });

export const queryClient = createQueryClient();

import { QueryClient } from "@tanstack/react-query";

/**
 * Shared TanStack Query client for workspace mutations.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The database is a long way from the shop (~250ms per round trip),
            // so cached data is worth far more here than freshness-by-default.
            // Every mutation already invalidates precisely what it touched, so a
            // longer window doesn't show stale numbers after an edit — it only
            // stops re-fetching unchanged data when navigating back to a screen.
            staleTime: 5 * 60_000,
            // Keep results in memory well past staleTime so returning to a screen
            // paints instantly from cache while any refetch happens in the
            // background, instead of flashing a spinner.
            gcTime: 30 * 60_000,
            // Show the previous page of results while the next request is in
            // flight. This is the single biggest *perceived* win: searching and
            // filtering now dim the list instead of blanking it to a spinner.
            placeholderData: keepPreviousData,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

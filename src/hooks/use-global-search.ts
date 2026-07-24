"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { read } from "@/lib/read-client";
import { useIsSuperAdmin } from "@/providers/auth-provider";

/**
 * All global-search result sets in one request.
 *
 * Replaces four separate queries (items / customers / orders / staff) that
 * Next.js dispatched one at a time — measured at ~1250ms serialized versus
 * ~310ms concurrent for the identical work.
 *
 * `keepPreviousData` keeps the last results on screen while the next query is in
 * flight, so typing dims the list instead of blanking it to a spinner. That is
 * most of the *perceived* slowness on a link this far from the database.
 */
export function useGlobalSearch(query: string, enabled: boolean) {
  const isSuperAdmin = useIsSuperAdmin();
  return useQuery({
    queryKey: ["global-search", query, isSuperAdmin],
    queryFn: () => read("search.global", query, isSuperAdmin),
    enabled,
    placeholderData: keepPreviousData,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";

import { read } from "@/lib/read-client";
import { useIsSuperAdmin } from "@/providers/auth-provider";

/**
 * Every dashboard/stat-bar figure in one request.
 *
 * The StatBar renders on every page, and the dashboard info cards add more on
 * top — previously four separate calls that Next.js dispatched one at a time.
 * One shared query key means the bar and the cards also de-duplicate into a
 * single fetch instead of racing each other.
 *
 * Financial figures are super-admin only, so the role is part of the key: an
 * admin and a super-admin must not share a cache entry.
 */
export function useDashboardBundle() {
  const isSuperAdmin = useIsSuperAdmin();
  return useQuery({
    queryKey: ["dashboard", "bundle", isSuperAdmin],
    queryFn: () => read("dashboard.bundle", isSuperAdmin),
    // Figures move with orders, not keystrokes — a minute of staleness is fine
    // and saves a refetch on every navigation.
    staleTime: 60_000,
  });
}

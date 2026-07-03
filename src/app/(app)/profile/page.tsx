"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Account editing moved into the unified Settings page. Keep this route as a
 * redirect so old links / bookmarks (and the previous topbar entry) still land
 * somewhere sensible.
 */
export default function ProfileRedirect() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/settings");
  }, [router]);
  return null;
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { getAccessToken } from "@/lib/auth-token";
import { getCustomer } from "@/server/actions/customers";
import type { NavigateTarget } from "@/types/assistant";

/**
 * Turns an assistant `navigateTo` target into real UI navigation — reusing the
 * existing DialogManager and routes. The customer profile dialog needs the full
 * row, so we fetch it (RLS-scoped) before opening.
 */
export function useAssistantNavigate() {
  const router = useRouter();
  const { openDialog } = useDialogManager();

  return React.useCallback(
    async (target: NavigateTarget) => {
      switch (target.kind) {
        case "customerProfile": {
          const customer = await getCustomer(await getAccessToken(), target.customerId);
          openDialog(DialogKey.CustomerProfile, { customer });
          break;
        }
        case "receipt":
          openDialog(DialogKey.Receipt, { orderId: target.orderId });
          break;
        case "route":
          router.push(target.path);
          break;
      }
    },
    [router, openDialog],
  );
}

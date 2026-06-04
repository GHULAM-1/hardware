"use client";

import * as React from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { DialogManagerProvider } from "@/components/dialogs/dialog-manager";
import { dialogRegistry } from "@/components/dialogs/registry";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryProvider>
        <AuthProvider>
          <I18nProvider>
            <DialogManagerProvider registry={dialogRegistry}>
              {children}
              <Toaster richColors position="top-center" />
            </DialogManagerProvider>
          </I18nProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

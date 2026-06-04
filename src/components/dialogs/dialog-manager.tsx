"use client";

import * as React from "react";

import type { DialogKey } from "@/lib/dialog-keys";

/** Props every registered dialog component receives. */
export type DialogComponentProps<P = unknown> = {
  payload: P;
  onClose: () => void;
};

export type DialogRegistry = Partial<
  Record<DialogKey, React.ComponentType<DialogComponentProps<never>>>
>;

type OpenState = { key: DialogKey; payload: unknown } | null;

type DialogManagerValue = {
  openDialog: <P = unknown>(key: DialogKey, payload?: P) => void;
  closeDialog: () => void;
};

const DialogManagerContext = React.createContext<DialogManagerValue | null>(null);

export function useDialogManager(): DialogManagerValue {
  const ctx = React.useContext(DialogManagerContext);
  if (!ctx) throw new Error("useDialogManager must be used within DialogManagerProvider");
  return ctx;
}

/**
 * Holds the currently-open dialog and renders it from a registry. The registry is
 * injected (see registry.tsx) so this stays decoupled from individual modules —
 * the backbone of the "no separate pages, shared dialogs" UX.
 */
export function DialogManagerProvider({
  registry,
  children,
}: {
  registry: DialogRegistry;
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<OpenState>(null);

  const value = React.useMemo<DialogManagerValue>(
    () => ({
      openDialog: (key, payload) => setState({ key, payload: payload ?? null }),
      closeDialog: () => setState(null),
    }),
    [],
  );

  const Active = state ? registry[state.key] : undefined;

  return (
    <DialogManagerContext.Provider value={value}>
      {children}
      {Active && state ? (
        <Active payload={state.payload as never} onClose={value.closeDialog} />
      ) : null}
    </DialogManagerContext.Provider>
  );
}

import { Loader2 } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

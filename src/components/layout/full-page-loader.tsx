import { Loader2 } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="bg-app flex min-h-dvh flex-1 items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-gold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
    </div>
  );
}

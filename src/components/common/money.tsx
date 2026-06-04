import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Renders a PKR amount, always LTR (numbers stay LTR even in Urdu/RTL). */
export function Money({
  value,
  className,
}: {
  value: number | string | null | undefined;
  className?: string;
}) {
  return (
    <span dir="ltr" className={cn("tabular-nums", className)}>
      {formatPKR(value)}
    </span>
  );
}

import { ArrowDown, ArrowUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: { direction: "up" | "down"; label: string; good: boolean };
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-[27px] font-semibold leading-none tabular-nums">{value}</p>
      {trend ? (
        <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", trend.good ? "text-status-good" : "text-status-critical")}>
          {trend.direction === "down" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
          {trend.label}
        </div>
      ) : sub ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </Card>
  );
}

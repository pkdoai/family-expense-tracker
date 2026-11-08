import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/domain/currency";
import { computeBudgetStatus, BUDGET_STATUS_LABEL } from "@/lib/domain/budget-status";
import type { BudgetStatus } from "@/lib/domain/types";

const STATUS_ICON: Record<BudgetStatus, typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const STATUS_VARIANT: Record<BudgetStatus, "good" | "warning" | "critical"> = {
  good: "good",
  warning: "warning",
  critical: "critical",
};

const STATUS_BAR: Record<BudgetStatus, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
};

export function BudgetCard({ actualCents, targetCents, className }: { actualCents: number; targetCents: number | null; className?: string }) {
  if (!targetCents) {
    return (
      <Card className={className + " flex flex-col justify-center p-5"}>
        <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">This Week&rsquo;s Plan</p>
        <p className="mt-2 text-sm text-muted-foreground">No planned amounts entered for this week in the spreadsheet yet.</p>
      </Card>
    );
  }

  const status = computeBudgetStatus(actualCents, targetCents);
  const Icon = STATUS_ICON[status];
  const percent = Math.min(100, Math.round((actualCents / targetCents) * 100));

  return (
    <Card className={(className ?? "") + " p-5"}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">This Week&rsquo;s Plan</p>
        <Badge variant={STATUS_VARIANT[status]}>
          <Icon className="size-3" />
          {BUDGET_STATUS_LABEL[status]}
        </Badge>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-xl font-semibold tabular-nums">{formatCents(actualCents)}</span>
        <span className="text-sm text-muted-foreground">of {formatCents(targetCents)} planned</span>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: STATUS_BAR[status] }}
        />
      </div>
    </Card>
  );
}

"use client";

import { AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CategoryDot } from "@/components/shared/category-icon";
import { useCategories } from "@/lib/hooks/use-workbook";
import { categoryPlanCents } from "@/lib/domain/plan-stats";
import { formatCents } from "@/lib/domain/currency";
import type { Expense } from "@/lib/domain/types";
import type { WorkbookSummary } from "@/lib/workbook";

/** This week's spending against each category's Plan amount from the spreadsheet. */
export function PlanVsActual({
  weekExpenses,
  week,
  summary,
}: {
  /** Spending entries for the week (income already excluded). */
  weekExpenses: Expense[];
  week: number;
  summary: WorkbookSummary;
}) {
  const categories = useCategories();
  const spent = new Map<string, number>();
  for (const e of weekExpenses) spent.set(e.category, (spent.get(e.category) ?? 0) + e.amountCents);

  const rows = categories.expenseList
    .map((c) => ({ id: c.id, label: c.label, spent: spent.get(c.id) ?? 0, plan: categoryPlanCents(summary, week, c.id) }))
    .filter((r) => r.spent > 0 || (r.plan ?? 0) > 0);

  return (
    <Card className="p-5">
      <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Week {week} · Spent vs. Plan
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing planned or spent yet this week.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {rows.map((r) => {
            const over = r.plan !== null && r.plan > 0 && r.spent > r.plan;
            return (
              <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                <CategoryDot category={r.id} />
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                {over && (
                  <Badge variant="critical">
                    <AlertCircle className="size-3" />
                    Over plan
                  </Badge>
                )}
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {formatCents(r.spent)}
                  {r.plan ? ` / ${formatCents(r.plan)}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

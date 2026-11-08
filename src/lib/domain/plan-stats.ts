import type { CategoryIndex } from "@/lib/domain/categories";
import type { Expense } from "@/lib/domain/types";
import type { WorkbookSummary } from "@/lib/workbook/types";

/** Spending only: income entries are never counted as money spent. */
export function spendingOnly(expenses: Expense[], categories: CategoryIndex): Expense[] {
  return expenses.filter((e) => !categories.isIncome(e.category));
}

/** What the plan says should be spent in a week: the Plan column summed over the expense rows. Null if nothing is planned. */
export function weekPlanCents(summary: WorkbookSummary | null, week: number): number | null {
  if (!summary) return null;
  const byCat = summary.planCents[String(week)];
  if (!byCat) return null;
  let total = 0;
  for (const c of summary.categories) {
    if (c.section === "income") continue;
    total += byCat[c.id] ?? 0;
  }
  return total > 0 ? total : null;
}

export function categoryPlanCents(summary: WorkbookSummary | null, week: number, categoryId: string): number | null {
  return summary?.planCents[String(week)]?.[categoryId] ?? null;
}

import type { CategoryId, Expense, ProgramSettings } from "@/lib/domain/types";
import { weekNumberForDate } from "@/lib/domain/week";
import { computeBudgetStatus } from "@/lib/domain/budget-status";
import type { BudgetStatus } from "@/lib/domain/types";

/** All pure, deterministic functions over an expense list — no I/O, easy to unit test. */

export function totalCents(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

export function categoryTotals(expenses: Expense[]): Partial<Record<CategoryId, number>> {
  const totals: Partial<Record<CategoryId, number>> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amountCents;
  }
  return totals;
}

export function topCategory(
  totals: Partial<Record<CategoryId, number>>,
): { category: CategoryId; cents: number } | null {
  let best: { category: CategoryId; cents: number } | null = null;
  for (const [category, cents] of Object.entries(totals) as [CategoryId, number][]) {
    if (!best || cents > best.cents) best = { category, cents };
  }
  return best;
}

export function expensesInWeek(expenses: Expense[], program: ProgramSettings, week: number): Expense[] {
  return expenses.filter((e) => weekNumberForDate(program, new Date(e.date)) === week);
}

export interface WeeklyTrendPoint {
  week: number;
  totalCents: number;
  status: BudgetStatus;
}

export function weeklyTrend(
  expenses: Expense[],
  program: ProgramSettings,
  throughWeek: number,
  weeklyBudgetCents: number | null,
): WeeklyTrendPoint[] {
  const points: WeeklyTrendPoint[] = [];
  for (let week = 1; week <= throughWeek; week++) {
    const total = totalCents(expensesInWeek(expenses, program, week));
    points.push({
      week,
      totalCents: total,
      status: computeBudgetStatus(total, weeklyBudgetCents ?? 0),
    });
  }
  return points;
}

export function percentOfTotal(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

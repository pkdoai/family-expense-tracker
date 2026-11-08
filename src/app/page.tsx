"use client";

import { CalendarRange, Receipt } from "lucide-react";

import { useSettings } from "@/lib/hooks/use-settings";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { useBudgetAlert } from "@/lib/hooks/use-budget-alert";
import { useWorkbook } from "@/lib/hooks/use-workbook";
import { spendingOnly, weekPlanCents } from "@/lib/domain/plan-stats";
import {
  totalCents,
  categoryTotals,
  topCategory,
  expensesInWeek,
  weeklyTrend,
} from "@/lib/domain/dashboard-stats";
import { getProgramProgress, weekNumbers, lastWeekNumber } from "@/lib/domain/week";
import { formatCents } from "@/lib/domain/currency";

import { StatTile } from "@/components/dashboard/stat-tile";
import { BudgetCard } from "@/components/dashboard/budget-card";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RecentExpenses } from "@/components/dashboard/recent-expenses";
import { PlanVsActual } from "@/components/dashboard/plan-vs-actual";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { StatTileSkeleton, ListRowSkeleton } from "@/components/shared/loading-skeleton";

export default function DashboardPage() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const { expenses: allEntries, loading: expensesLoading } = useExpenses();
  const { summary, categories } = useWorkbook();
  const { program } = settings;

  // Income entries are recorded too, but they're never counted as money spent.
  const expenses = spendingOnly(allEntries, categories);

  const progress = getProgramProgress(program);
  const currentWeek = progress.currentWeek;

  const spentTotal = totalCents(expenses);
  const totals = categoryTotals(expenses);
  const top = topCategory(totals);
  const weekExpenses = currentWeek !== null ? expensesInWeek(expenses, program, currentWeek) : [];
  const weekTotal = totalCents(weekExpenses);
  const planForWeek = (week: number) => weekPlanCents(summary, week);
  const trend = currentWeek !== null ? weeklyTrend(expenses, program, currentWeek, planForWeek) : [];
  const weekPlan = currentWeek !== null ? planForWeek(currentWeek) : null;

  useBudgetAlert(currentWeek, weekTotal, weekPlan);

  const loading = !settingsLoaded || expensesLoading;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTileSkeleton />
          <StatTileSkeleton />
          <StatTileSkeleton />
        </div>
        <Card className="p-5">
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </Card>
      </div>
    );
  }

  if (allEntries.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <EmptyState
          icon={Receipt}
          title="No expenses logged yet"
          description={`Start tracking ${settings.family.familyName || "your family"}'s spending — add your first expense to see it show up here.`}
          action={<AddExpenseButton />}
          className="mt-8"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Total Spent"
          value={formatCents(spentTotal)}
          sub={`Across ${expenses.length} expense${expenses.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="This Week's Spend"
          value={currentWeek !== null ? formatCents(weekTotal) : "—"}
          sub={currentWeek !== null ? `Week ${currentWeek} of ${lastWeekNumber(program)}` : "Program hasn't started"}
        />
        <StatTile
          label="Top Category"
          value={top ? categories.get(top.category).label : "—"}
          sub={top ? formatCents(top.cents) : "No spending yet"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BudgetCard actualCents={weekTotal} targetCents={weekPlan} className="lg:col-span-1" />
        <Card className="p-5 lg:col-span-2">
          <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Category Breakdown
          </p>
          <div className="mt-3">
            <CategoryBreakdownChart totals={totals} />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Weekly Spending vs. Plan
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarRange className="size-3.5" strokeWidth={1.75} />
              {progress.hasEnded ? "Program complete" : `${progress.daysRemaining} days left`}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <TrendChart trend={trend} weeks={weekNumbers(program)} planForWeek={planForWeek} />
        </div>
      </Card>

      {summary && currentWeek !== null && (
        <PlanVsActual weekExpenses={weekExpenses} week={currentWeek} summary={summary} />
      )}

      <RecentExpenses expenses={allEntries} />
    </div>
  );
}

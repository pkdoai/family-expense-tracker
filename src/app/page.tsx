"use client";

import { CalendarRange, Receipt } from "lucide-react";

import { useSettings } from "@/lib/hooks/use-settings";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { useBudgetAlert } from "@/lib/hooks/use-budget-alert";
import {
  totalCents,
  categoryTotals,
  topCategory,
  expensesInWeek,
  weeklyTrend,
} from "@/lib/domain/dashboard-stats";
import { getProgramProgress } from "@/lib/domain/week";
import { formatCents } from "@/lib/domain/currency";
import { getCategory } from "@/lib/domain/categories";

import { StatTile } from "@/components/dashboard/stat-tile";
import { BudgetCard } from "@/components/dashboard/budget-card";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RecentExpenses } from "@/components/dashboard/recent-expenses";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { StatTileSkeleton, ListRowSkeleton } from "@/components/shared/loading-skeleton";

export default function DashboardPage() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { program, budget } = settings;

  const progress = getProgramProgress(program);
  const currentWeek = progress.currentWeek;

  const spentTotal = totalCents(expenses);
  const totals = categoryTotals(expenses);
  const top = topCategory(totals);
  const weekExpenses = currentWeek ? expensesInWeek(expenses, program, currentWeek) : [];
  const weekTotal = totalCents(weekExpenses);
  const trend = currentWeek ? weeklyTrend(expenses, program, currentWeek, budget.weeklyBudgetCents) : [];

  useBudgetAlert(currentWeek, weekTotal, budget.weeklyBudgetCents);

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

  if (expenses.length === 0) {
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
          value={currentWeek ? formatCents(weekTotal) : "—"}
          sub={currentWeek ? `Week ${currentWeek} of ${program.lengthWeeks}` : "Program hasn't started"}
        />
        <StatTile
          label="Top Category"
          value={top ? getCategory(top.category).label : "—"}
          sub={top ? formatCents(top.cents) : "No spending yet"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BudgetCard actualCents={weekTotal} targetCents={budget.weeklyBudgetCents} className="lg:col-span-1" />
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
            {program.lengthWeeks}-Week Trend
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarRange className="size-3.5" strokeWidth={1.75} />
              {progress.hasEnded ? "Program complete" : `${progress.daysRemaining} days left`}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <TrendChart trend={trend} lengthWeeks={program.lengthWeeks} weeklyBudgetCents={budget.weeklyBudgetCents} />
        </div>
      </Card>

      <RecentExpenses expenses={expenses} />
    </div>
  );
}

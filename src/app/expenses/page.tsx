"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { useSettings } from "@/lib/hooks/use-settings";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { weekNumberForDate } from "@/lib/domain/week";
import { expensesToCsv, csvFilename, downloadCsv } from "@/lib/domain/csv";
import { totalCents } from "@/lib/domain/dashboard-stats";
import { formatCents } from "@/lib/domain/currency";
import { CATEGORY_IDS } from "@/lib/domain/types";
import type { ExpenseFilters } from "@/lib/domain/types";

import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { ExpenseFiltersBar, NO_FILTERS } from "@/components/expenses/expense-filters";
import { ExpenseList } from "@/components/expenses/expense-list";
import { Button } from "@/components/ui/button";
import { ListRowSkeleton } from "@/components/shared/loading-skeleton";
import { Card } from "@/components/ui/card";

/**
 * Reads a `?week=` and/or `?category=` param — set by the command palette's
 * "Jump to a week" / "Filter by category" entries — and folds it into the
 * starting filter state, so those links actually land pre-filtered instead
 * of on an unfiltered list. Wrapped in Suspense below because Next.js
 * requires that anywhere useSearchParams() is used.
 */
function useFiltersFromSearchParams(): ExpenseFilters {
  const searchParams = useSearchParams();
  return React.useMemo(() => {
    const week = searchParams.get("week");
    const category = searchParams.get("category");
    const weekNumber = week ? Number(week) : NaN;
    return {
      ...NO_FILTERS,
      week: Number.isInteger(weekNumber) && weekNumber > 0 ? weekNumber : "all",
      category: category && (CATEGORY_IDS as readonly string[]).includes(category) ? (category as ExpenseFilters["category"]) : "all",
    };
  }, [searchParams]);
}

function ExpensesPageInner() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const { expenses, loading: expensesLoading } = useExpenses();
  const initialFilters = useFiltersFromSearchParams();
  const [filters, setFilters] = React.useState<ExpenseFilters>(initialFilters);

  // Re-apply whenever the URL's week/category param changes — e.g. picking
  // a different week from the command palette while already on this page.
  // This mirrors a prop change, not an external system, but the palette
  // navigates via router.push rather than a remount, so there's no other
  // lifecycle point to catch the new param.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilters.week, initialFilters.category]);

  const filtered = React.useMemo(() => {
    return expenses
      .filter((e) => {
        if (filters.category !== "all" && e.category !== filters.category) return false;
        if (filters.week !== "all" && weekNumberForDate(settings.program, new Date(e.date)) !== filters.week) {
          return false;
        }
        if (filters.search && !e.description.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  }, [expenses, filters, settings.program]);

  const loading = !settingsLoaded || expensesLoading;

  function handleExport() {
    const csv = expensesToCsv(filtered, settings.program, settings.family.familyName || "Family");
    downloadCsv(csv, csvFilename(settings.family.familyName || "family"));
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} expense{filtered.length === 1 ? "" : "s"} &middot; {formatCents(totalCents(filtered))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
          <AddExpenseButton size="sm" />
        </div>
      </div>

      <ExpenseFiltersBar filters={filters} onChange={setFilters} lengthWeeks={settings.program.lengthWeeks} />

      {loading ? (
        <Card className="p-5">
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </Card>
      ) : (
        <ExpenseList expenses={filtered} hasAnyExpenses={expenses.length > 0} />
      )}
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <React.Suspense fallback={null}>
      <ExpensesPageInner />
    </React.Suspense>
  );
}

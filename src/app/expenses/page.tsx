"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { useSettings } from "@/lib/hooks/use-settings";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { weekNumberForDate } from "@/lib/domain/week";
import { expensesToCsv, csvFilename, downloadCsv } from "@/lib/domain/csv";
import { totalCents } from "@/lib/domain/dashboard-stats";
import { formatCents } from "@/lib/domain/currency";
import type { ExpenseFilters } from "@/lib/domain/types";

import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { ExpenseFiltersBar, NO_FILTERS } from "@/components/expenses/expense-filters";
import { ExpenseList } from "@/components/expenses/expense-list";
import { Button } from "@/components/ui/button";
import { ListRowSkeleton } from "@/components/shared/loading-skeleton";
import { Card } from "@/components/ui/card";

export default function ExpensesPage() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const { expenses, loading: expensesLoading } = useExpenses();
  const [filters, setFilters] = React.useState<ExpenseFilters>(NO_FILTERS);

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

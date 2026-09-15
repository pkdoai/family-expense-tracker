import Link from "next/link";
import { Camera } from "lucide-react";

import { Card } from "@/components/ui/card";
import { CategoryIcon, CategoryLabel } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCents } from "@/lib/domain/currency";
import { Receipt } from "lucide-react";
import type { Expense } from "@/lib/domain/types";

function formatShortDate(iso: string): string {
  // Parse as a plain calendar date (avoid UTC/local timezone shift).
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentExpenses({ expenses, limit = 6 }: { expenses: Expense[]; limit?: number }) {
  const recent = [...expenses]
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
    .slice(0, limit);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Recent Expenses
        </p>
        <Link href="/expenses" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Add your first expense to start tracking this week's spending."
          className="mt-3 border-none px-0 py-8"
        />
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {recent.map((expense) => (
            <li key={expense.id} className="flex items-center gap-3 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <CategoryIcon category={expense.category} size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  <CategoryLabel category={expense.category} /> &middot; {formatShortDate(expense.date)}
                </p>
              </div>
              {expense.photoIds.length > 0 ? (
                <Camera className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              ) : null}
              <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
                {formatCents(expense.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

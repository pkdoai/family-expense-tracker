"use client";

import * as React from "react";
import { Camera, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CategoryIcon, CategoryLabel } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { formatCents } from "@/lib/domain/currency";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { SearchX } from "lucide-react";
import type { Expense } from "@/lib/domain/types";
import { useCategories } from "@/lib/hooks/use-workbook";
import { paymentTypeLabel, writesEqual } from "@/lib/workbook";

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function ExpenseList({ expenses, hasAnyExpenses }: { expenses: Expense[]; hasAnyExpenses: boolean }) {
  const { removeExpense } = useExpenses();
  const categories = useCategories();
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [deleting, setDeleting] = React.useState<Expense | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await removeExpense(deleting.id);
      toast.success("Expense deleted");
    } catch {
      toast.error("Couldn't delete that expense — please try again.");
    } finally {
      setDeleting(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={hasAnyExpenses ? "No expenses match your filters" : "No expenses yet"}
        description={
          hasAnyExpenses
            ? "Try clearing a filter or searching for something else."
            : "Add your first expense to start tracking."
        }
        className="mt-4"
      />
    );
  }

  return (
    <>
      <Card className="divide-y divide-border p-0">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <CategoryIcon category={expense.category} size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{expense.description}</p>
              <p className="text-xs text-muted-foreground">
                <CategoryLabel category={expense.category} /> &middot; {formatFullDate(expense.date)}
                {" · "}
                {categories.isIncome(expense.category)
                  ? "Income"
                  : expense.paymentType
                    ? paymentTypeLabel(expense.paymentType)
                    : "—"}
                {writesEqual(expense.committed, expense.write) ? "" : " · not saved to spreadsheet yet"}
              </p>
            </div>
            {expense.photoIds.length > 0 ? (
              <Camera className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            ) : null}
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
              {formatCents(expense.amountCents)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 shrink-0">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(expense)}>
                  <Pencil className="size-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setDeleting(expense)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </Card>

      {editing && <ExpenseFormDialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} expense={editing} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this expense?"
        description={
          deleting ? (
            <>
              This will permanently remove &ldquo;{deleting.description}&rdquo; ({formatCents(deleting.amountCents)}) and
              any attached receipt photo. This can&rsquo;t be undone.
              {deleting.committed
                ? " It's already in your saved spreadsheet, so it will be taken out of it the next time you Finish & save."
                : ""}
            </>
          ) : null
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}

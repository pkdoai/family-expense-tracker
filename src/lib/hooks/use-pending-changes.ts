"use client";

import { useExpenses } from "@/lib/hooks/use-expenses";
import { useWorkbook } from "@/lib/hooks/use-workbook";
import { writesEqual } from "@/lib/workbook";

/** How many entries (added, edited or deleted) aren't in the last saved copy of the spreadsheet yet. */
export function usePendingChanges(): number {
  const { expenses } = useExpenses();
  const { record } = useWorkbook();
  if (!record) return 0;
  return expenses.filter((e) => !writesEqual(e.committed, e.write)).length + record.pendingRemovals.length;
}

"use client";

import * as React from "react";

import type { Expense, NewExpense } from "@/lib/domain/types";
import { expenseRepository, photoRepository, workbookRepository } from "@/lib/storage/repositories";
import { useWorkbook } from "@/lib/hooks/use-workbook";
import { planWrite, WorkbookError, type WorkbookSummary } from "@/lib/workbook";

/** Work out where an entry lands in the spreadsheet (throws a readable WorkbookError if it can't). */
function writeFor(summary: WorkbookSummary | null, e: Omit<NewExpense, "photoIds">) {
  if (!summary) throw new WorkbookError("layout", "Load your spending plan first.");
  return planWrite(summary, {
    date: e.date,
    amountCents: e.amountCents,
    categoryId: e.category,
    description: e.description,
    payment: e.paymentType ?? null,
  });
}

interface ExpensesContextValue {
  expenses: Expense[];
  loading: boolean;
  addExpense: (expense: NewExpense, photos: Blob[]) => Promise<Expense>;
  updateExpense: (id: string, patch: Partial<NewExpense>, newPhotos?: Blob[]) => Promise<Expense>;
  removeExpense: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  /** Wipes expenses, photos and the loaded spreadsheet from this device. */
  clearAll: () => Promise<void>;
  /** After the family confirms saving the updated file: everything is now in the saved copy. */
  markAllCommitted: () => Promise<void>;
}

const ExpensesContext = React.createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const { summary, addPendingRemoval, reload: reloadWorkbook } = useWorkbook();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const list = await expenseRepository.list();
    setExpenses(list);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    // Initial load from IndexedDB — an external, async data source that
    // can't be read during render (or on the server at all), so this has
    // to be an effect rather than a lazy useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const addExpense = React.useCallback(
    async (expense: NewExpense, photos: Blob[]) => {
      const write = writeFor(summary, expense);
      const created = await expenseRepository.add({ ...expense, write, committed: null });
      let photoIds = created.photoIds;
      if (photos.length > 0) {
        const stored = await Promise.all(photos.map((p) => photoRepository.add(created.id, p)));
        photoIds = stored.map((p) => p.id);
        await expenseRepository.update(created.id, { photoIds });
      }
      await reload();
      return { ...created, photoIds };
    },
    [reload, summary],
  );

  const updateExpense = React.useCallback(
    async (id: string, patch: Partial<NewExpense>, newPhotos: Blob[] = []) => {
      let photoIds = patch.photoIds;
      if (newPhotos.length > 0) {
        const stored = await Promise.all(newPhotos.map((p) => photoRepository.add(id, p)));
        const existing = expenses.find((e) => e.id === id)?.photoIds ?? [];
        photoIds = [...existing, ...stored.map((p) => p.id)];
      }
      const existing = expenses.find((e) => e.id === id);
      if (!existing) throw new Error(`Expense not found: ${id}`);
      const merged = { ...existing, ...patch };
      const write = writeFor(summary, merged);
      const updated = await expenseRepository.update(id, { ...patch, ...(photoIds ? { photoIds } : {}), write });
      await reload();
      return updated;
    },
    [expenses, reload, summary],
  );

  const removeExpense = React.useCallback(
    async (id: string) => {
      const existing = await expenseRepository.get(id);
      // Already in the saved copy of the spreadsheet? Then its amount still has to be taken back out.
      if (existing?.committed) await addPendingRemoval(existing.committed);
      await photoRepository.removeByExpense(id);
      await expenseRepository.remove(id);
      await reload();
    },
    [reload, addPendingRemoval],
  );

  const clearAll = React.useCallback(async () => {
    await expenseRepository.clear();
    await photoRepository.clear();
    await workbookRepository.clear();
    await reload();
    await reloadWorkbook();
  }, [reload, reloadWorkbook]);

  const markAllCommitted = React.useCallback(async () => {
    const list = await expenseRepository.list();
    await expenseRepository.bulkReplace(list.map((e) => ({ ...e, committed: e.write ?? null })));
    await reload();
  }, [reload]);

  const value = React.useMemo<ExpensesContextValue>(
    () => ({ expenses, loading, addExpense, updateExpense, removeExpense, reload, clearAll, markAllCommitted }),
    [expenses, loading, addExpense, updateExpense, removeExpense, reload, clearAll, markAllCommitted],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = React.useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used within an ExpensesProvider");
  return ctx;
}

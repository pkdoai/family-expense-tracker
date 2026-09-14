"use client";

import * as React from "react";

import type { Expense, NewExpense } from "@/lib/domain/types";
import { expenseRepository, photoRepository } from "@/lib/storage/repositories";

interface ExpensesContextValue {
  expenses: Expense[];
  loading: boolean;
  addExpense: (expense: NewExpense, photos: Blob[]) => Promise<Expense>;
  updateExpense: (id: string, patch: Partial<NewExpense>, newPhotos?: Blob[]) => Promise<Expense>;
  removeExpense: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clearAll: () => Promise<void>;
  replaceAll: (expenses: NewExpense[]) => Promise<void>;
}

const ExpensesContext = React.createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
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
      const created = await expenseRepository.add(expense);
      let photoIds = created.photoIds;
      if (photos.length > 0) {
        const stored = await Promise.all(photos.map((p) => photoRepository.add(created.id, p)));
        photoIds = stored.map((p) => p.id);
        await expenseRepository.update(created.id, { photoIds });
      }
      await reload();
      return { ...created, photoIds };
    },
    [reload],
  );

  const updateExpense = React.useCallback(
    async (id: string, patch: Partial<NewExpense>, newPhotos: Blob[] = []) => {
      let photoIds = patch.photoIds;
      if (newPhotos.length > 0) {
        const stored = await Promise.all(newPhotos.map((p) => photoRepository.add(id, p)));
        const existing = expenses.find((e) => e.id === id)?.photoIds ?? [];
        photoIds = [...existing, ...stored.map((p) => p.id)];
      }
      const updated = await expenseRepository.update(id, { ...patch, ...(photoIds ? { photoIds } : {}) });
      await reload();
      return updated;
    },
    [expenses, reload],
  );

  const removeExpense = React.useCallback(
    async (id: string) => {
      await photoRepository.removeByExpense(id);
      await expenseRepository.remove(id);
      await reload();
    },
    [reload],
  );

  const clearAll = React.useCallback(async () => {
    await expenseRepository.clear();
    await photoRepository.clear();
    await reload();
  }, [reload]);

  const replaceAll = React.useCallback(
    async (newExpenses: NewExpense[]) => {
      await expenseRepository.clear();
      await photoRepository.clear();
      const now = new Date().toISOString();
      const full: Expense[] = newExpenses.map((e, i) => ({
        ...e,
        id: `sample_${Date.now()}_${i}`,
        createdAt: now,
        updatedAt: now,
      }));
      await expenseRepository.bulkReplace(full);
      await reload();
    },
    [reload],
  );

  const value = React.useMemo<ExpensesContextValue>(
    () => ({ expenses, loading, addExpense, updateExpense, removeExpense, reload, clearAll, replaceAll }),
    [expenses, loading, addExpense, updateExpense, removeExpense, reload, clearAll, replaceAll],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = React.useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used within an ExpensesProvider");
  return ctx;
}

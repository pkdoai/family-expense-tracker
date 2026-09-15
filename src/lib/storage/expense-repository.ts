import { getDb } from "@/lib/storage/db";
import type { Expense, NewExpense } from "@/lib/domain/types";

/**
 * Storage contract for expenses. UI code and hooks depend on this
 * interface, never on IndexedDB directly (dependency inversion) — a
 * different implementation (in-memory, a future sync backend, a test
 * double) can be substituted without touching a single component.
 */
export interface ExpenseRepository {
  list(): Promise<Expense[]>;
  get(id: string): Promise<Expense | undefined>;
  add(expense: NewExpense): Promise<Expense>;
  update(id: string, patch: Partial<NewExpense>): Promise<Expense>;
  remove(id: string): Promise<void>;
  bulkReplace(expenses: Expense[]): Promise<void>;
  clear(): Promise<void>;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `exp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class IndexedDbExpenseRepository implements ExpenseRepository {
  async list(): Promise<Expense[]> {
    const db = await getDb();
    const all = await db.getAll("expenses");
    return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Expense | undefined> {
    const db = await getDb();
    return db.get("expenses", id);
  }

  async add(expense: NewExpense): Promise<Expense> {
    const db = await getDb();
    const now = new Date().toISOString();
    const full: Expense = { ...expense, id: newId(), createdAt: now, updatedAt: now };
    await db.put("expenses", full);
    return full;
  }

  async update(id: string, patch: Partial<NewExpense>): Promise<Expense> {
    const db = await getDb();
    const existing = await db.get("expenses", id);
    if (!existing) throw new Error(`Expense not found: ${id}`);
    const updated: Expense = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    await db.put("expenses", updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete("expenses", id);
  }

  async bulkReplace(expenses: Expense[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction("expenses", "readwrite");
    await tx.store.clear();
    for (const expense of expenses) {
      await tx.store.put(expense);
    }
    await tx.done;
  }

  async clear(): Promise<void> {
    const db = await getDb();
    await db.clear("expenses");
  }
}

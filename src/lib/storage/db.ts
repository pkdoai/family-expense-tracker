import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { Expense, ExpensePhoto } from "@/lib/domain/types";

interface ExpenseTrackerDB extends DBSchema {
  expenses: {
    key: string;
    value: Expense;
    indexes: { "by-date": string; "by-category": string };
  };
  photos: {
    key: string;
    value: ExpensePhoto;
    indexes: { "by-expense": string };
  };
}

const DB_NAME = "family-expense-tracker";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ExpenseTrackerDB>> | null = null;

/**
 * Single entry point for the IndexedDB connection. Repositories go through
 * this rather than calling `indexedDB` directly, so the schema/migration
 * logic lives in exactly one place.
 */
export function getDb(): Promise<IDBPDatabase<ExpenseTrackerDB>> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<ExpenseTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("expenses")) {
          const store = db.createObjectStore("expenses", { keyPath: "id" });
          store.createIndex("by-date", "date");
          store.createIndex("by-category", "category");
        }
        if (!db.objectStoreNames.contains("photos")) {
          const store = db.createObjectStore("photos", { keyPath: "id" });
          store.createIndex("by-expense", "expenseId");
        }
      },
    });
  }
  return dbPromise;
}

export type { ExpenseTrackerDB };

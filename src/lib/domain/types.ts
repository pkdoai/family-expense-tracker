/**
 * Core domain types for the family expense tracker.
 *
 * These types have no dependency on React, IndexedDB, or any other
 * infrastructure concern — they describe the problem domain only, so
 * storage and UI can both depend on them without depending on each other.
 */

export const CATEGORY_IDS = [
  "groceries",
  "transportation",
  "utilities",
  "communications",
  "evictions",
  "daycare",
  "entertainment",
  "shopping",
  "bills",
  "other",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const WEEK_BOUNDARIES = ["sunday", "monday"] as const;
export type WeekBoundary = (typeof WEEK_BOUNDARIES)[number];

export interface ExpensePhoto {
  id: string;
  expenseId: string;
  /** Raw image bytes, stored in IndexedDB — never in localStorage. */
  blob: Blob;
  contentType: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  /** ISO date, yyyy-MM-dd — always a calendar date, never a timestamp. */
  date: string;
  /** Amount stored as integer cents to avoid floating-point currency bugs. */
  amountCents: number;
  category: CategoryId;
  description: string;
  /** Only meaningful when category === "other". */
  subcategory?: string;
  /** Only meaningful when category === "other" (per the current product decision). */
  paymentMethod?: string;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type NewExpense = Omit<Expense, "id" | "createdAt" | "updatedAt">;

export interface FamilySettings {
  familyName: string;
}

export interface ProgramSettings {
  /** ISO date, yyyy-MM-dd */
  startDate: string;
  lengthWeeks: number;
  weekBoundary: WeekBoundary;
}

export interface BudgetSettings {
  /** Optional weekly spending target, in cents. Null = no target set. */
  weeklyBudgetCents: number | null;
}

export interface AppSettings {
  family: FamilySettings;
  program: ProgramSettings;
  budget: BudgetSettings;
  /** Set once onboarding has been completed. */
  onboarded: boolean;
}

export type BudgetStatus = "good" | "warning" | "critical";

export interface ExpenseFilters {
  search: string;
  category: CategoryId | "all";
  week: number | "all";
  startDate: string | null;
  endDate: string | null;
}

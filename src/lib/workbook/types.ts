/**
 * Types for the spending-plan workbook (.xlsx) integration. Nothing in this
 * folder depends on React, IndexedDB, or the DOM, so the whole layer can be
 * unit-tested in plain Node.
 */

export type PaymentType = "cash" | "debit" | "cashapp" | "credit";

export const PAYMENT_TYPES: { id: PaymentType; label: string; noteLabel: string }[] = [
  { id: "cash", label: "Cash", noteLabel: "cash" },
  { id: "debit", label: "Debit card", noteLabel: "debit" },
  { id: "cashapp", label: "CashApp", noteLabel: "CashApp" },
  { id: "credit", label: "Credit card", noteLabel: "credit card" },
];

export function paymentTypeLabel(id: PaymentType): string {
  return PAYMENT_TYPES.find((p) => p.id === id)?.label ?? id;
}

/** Which block of a week tab a category row lives in. */
export type CategorySection = "income" | "fixed" | "variable";

export interface WorkbookCategory {
  /** Stable id: the row number on every week tab ("row-17"). Renames keep the row, so ids survive renames. */
  id: string;
  row: number;
  label: string;
  section: CategorySection;
  /** The "Credit Card Payment" category always lands in the Actual column — that money leaves checking. */
  isCreditCardPayment: boolean;
}

export interface WorkbookWeek {
  number: number;
  sheet: string;
  /** ISO yyyy-MM-dd, inclusive */
  start: string;
  end: string;
}

export interface SectionColumns {
  plan: string;
  actual: string;
  /** Null for the income block, which has no credit-card column. */
  creditCard: string | null;
  notes: string;
}

export interface WorkbookSummary {
  familyName: string;
  /** ISO date from Start Here!B6 — the first day of Week 0. */
  startDate: string;
  weeks: WorkbookWeek[];
  categories: WorkbookCategory[];
  columns: Record<CategorySection, SectionColumns>;
  /** week number -> category id -> planned cents (only categories with a Plan > 0). */
  planCents: Record<string, Record<string, number>>;
  /** "Sheet!Cell" entries the app must not write to (the cell holds text, a shared formula, etc.). */
  blocked: string[];
}

/**
 * One expense's footprint in the workbook: the "+amount" term it added to an
 * Actual / Credit Card Actual cell, and the sentence it added to the row's
 * Notes cell. The app remembers this so edits and deletes can undo exactly
 * its own contribution and leave hand-typed amounts alone.
 */
export interface SheetWrite {
  sheet: string;
  cell: string;
  term: string;
  noteCell: string;
  noteSegment: string;
}

export type WorkbookErrorCode = "layout" | "conflict" | "date" | "file";

export class WorkbookError extends Error {
  constructor(
    public readonly code: WorkbookErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkbookError";
  }
}

import { addDays, format, min as minDate } from "date-fns";

import type { NewExpense, ProgramSettings, CategoryId } from "@/lib/domain/types";
import { weekRange, getProgramProgress, programEndDate } from "@/lib/domain/week";

interface Vendor {
  category: CategoryId;
  name: string;
  /** Typical amount range, in whole dollars. */
  min: number;
  max: number;
  /** Roughly how many times this vendor shows up per week (can be fractional). */
  frequency: number;
  subcategory?: string;
  paymentMethod?: string;
}

const VENDORS: Vendor[] = [
  { category: "groceries", name: "Harborview Market", min: 45, max: 130, frequency: 1.4 },
  { category: "groceries", name: "Corner Fresh Grocer", min: 18, max: 55, frequency: 0.6 },
  { category: "transportation", name: "Metro Transit — weekly pass", min: 38, max: 44, frequency: 1 },
  { category: "transportation", name: "Riverside Gas & Fuel", min: 30, max: 60, frequency: 0.4 },
  { category: "utilities", name: "City Power & Light", min: 95, max: 145, frequency: 0.25 },
  { category: "utilities", name: "Municipal Water Dept.", min: 35, max: 60, frequency: 0.2 },
  { category: "communications", name: "Northline Mobile", min: 65, max: 85, frequency: 0.25 },
  { category: "daycare", name: "Sunnyside Learning Center", min: 170, max: 210, frequency: 1 },
  { category: "entertainment", name: "Riverside Cinema", min: 20, max: 45, frequency: 0.3 },
  { category: "entertainment", name: "StreamPlus subscription", min: 12, max: 16, frequency: 0.25 },
  { category: "shopping", name: "Cedar Street Outfitters", min: 25, max: 95, frequency: 0.4 },
  { category: "bills", name: "First Horizon Insurance", min: 110, max: 160, frequency: 0.25 },
  { category: "bills", name: "Community Credit Union — loan pmt", min: 80, max: 80, frequency: 0.2 },
  { category: "evictions", name: "Legal Aid Society — filing fee", min: 60, max: 90, frequency: 0.15 },
  { category: "other", name: "Riverside Pharmacy", min: 15, max: 40, frequency: 0.3, subcategory: "Pharmacy", paymentMethod: "Debit card" },
];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomDayIn(start: Date, end: Date): Date {
  const span = Math.max(0, (end.getTime() - start.getTime()) / 86_400_000);
  return addDays(start, Math.floor(Math.random() * (span + 1)));
}

/**
 * Deterministic-ish sample data for demos and testing: realistic vendor
 * names spread across every category, from the program's start date up
 * through today (or the program's end, whichever is sooner) — so the
 * dashboard and charts have something believable to show immediately.
 */
export function generateSampleExpenses(program: ProgramSettings, today: Date = new Date()): NewExpense[] {
  const progress = getProgramProgress(program, today);
  const lastWeek = progress.hasStarted ? progress.currentWeek ?? program.lengthWeeks : 0;
  const expenses: NewExpense[] = [];

  for (let week = 1; week <= lastWeek; week++) {
    const { start, end } = weekRange(program, week);
    const cappedEnd = minDate([end, programEndDate(program), today]);
    if (cappedEnd < start) continue;

    for (const vendor of VENDORS) {
      const occurrences = Math.random() < vendor.frequency % 1 ? Math.ceil(vendor.frequency) : Math.floor(vendor.frequency);
      for (let i = 0; i < occurrences; i++) {
        const date = randomDayIn(start, cappedEnd);
        expenses.push({
          date: format(date, "yyyy-MM-dd"),
          amountCents: Math.round(randomBetween(vendor.min, vendor.max) * 100),
          category: vendor.category,
          description: vendor.name,
          subcategory: vendor.subcategory,
          paymentMethod: vendor.paymentMethod,
          photoIds: [],
        });
      }
    }
  }

  return expenses.sort((a, b) => a.date.localeCompare(b.date));
}

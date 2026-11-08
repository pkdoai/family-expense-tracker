import type { CategoryIndex } from "@/lib/domain/categories";
import { SECTION_LABEL } from "@/lib/domain/categories";
import type { Expense, ProgramSettings } from "@/lib/domain/types";
import { weekNumberForDate } from "@/lib/domain/week";
import { centsToDollars } from "@/lib/domain/currency";
import { paymentTypeLabel } from "@/lib/workbook/types";

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build the CSV text for a set of expenses. The family name rides along on
 * every row (not just a header comment) so the file is unambiguous once
 * it's out of the app — in a spreadsheet, forwarded, or archived.
 */
export function expensesToCsv(
  expenses: Expense[],
  program: ProgramSettings,
  familyName: string,
  categories: CategoryIndex,
): string {
  const header = ["Family", "Date", "Week", "Type", "Category", "Paid With", "Description", "Amount (USD)"];

  const rows = expenses.map((expense) => {
    const week = weekNumberForDate(program, new Date(expense.date));
    const category = categories.get(expense.category);
    return [
      familyName,
      expense.date,
      week !== null ? `Week ${week}` : "",
      category.section === "unknown" ? "" : SECTION_LABEL[category.section],
      category.label,
      expense.paymentType ? paymentTypeLabel(expense.paymentType) : "",
      expense.description,
      centsToDollars(expense.amountCents).toFixed(2),
    ];
  });

  return [header, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\r\n");
}

export function csvFilename(familyName: string): string {
  const slug = familyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "family";
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-expenses-${date}.csv`;
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import type { Expense, ProgramSettings } from "@/lib/domain/types";
import { getCategory } from "@/lib/domain/categories";
import { weekNumberForDate } from "@/lib/domain/week";
import { centsToDollars } from "@/lib/domain/currency";

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
): string {
  const header = [
    "Family",
    "Date",
    "Week",
    "Category",
    "Sub-category",
    "Payment Method",
    "Description",
    "Amount (USD)",
  ];

  const rows = expenses.map((expense) => {
    const week = weekNumberForDate(program, new Date(expense.date));
    return [
      familyName,
      expense.date,
      week ? `Week ${week}` : "",
      getCategory(expense.category).label,
      expense.subcategory ?? "",
      expense.paymentMethod ?? "",
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

import { z } from "zod";
import { format } from "date-fns";

import type { CategoryIndex } from "@/lib/domain/categories";
import type { ProgramSettings } from "@/lib/domain/types";
import { isDateWithinProgram, programStartDate, programEndDate } from "@/lib/domain/week";

const PAYMENT_IDS = ["cash", "debit", "cashapp", "credit"] as const;

export const expenseFormBaseSchema = z.object({
  date: z.string().min(1, "Pick a date"),
  amount: z
    .number({ error: "Enter an amount" })
    .positive("Amount must be greater than $0")
    .max(999_999, "That amount looks too large"),
  category: z.string().min(1, "Choose a category"),
  description: z.string().trim().min(1, "Add a short description").max(200, "Keep it under 200 characters"),
  paymentType: z.enum(PAYMENT_IDS).optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormBaseSchema>;

/**
 * The date-range and payment-type checks depend on the loaded spending plan,
 * so this is a schema *factory*: the program and categories are captured once
 * per form instance, and every validation run uses the same rules the form's
 * own date picker and payment field are built from.
 */
export function buildExpenseSchema(program: ProgramSettings, categories: CategoryIndex) {
  return expenseFormBaseSchema.superRefine((values, ctx) => {
    const date = new Date(values.date);
    if (Number.isNaN(date.getTime()) || !isDateWithinProgram(program, date)) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: `Date must fall within the program (${format(programStartDate(program), "MMM d, yyyy")} – ${format(programEndDate(program), "MMM d, yyyy")})`,
      });
    }
    // Every purchase needs a payment type; income received doesn't have one.
    if (!categories.isIncome(values.category) && !values.paymentType) {
      ctx.addIssue({ code: "custom", path: ["paymentType"], message: "Pick how this was paid" });
    }
  });
}

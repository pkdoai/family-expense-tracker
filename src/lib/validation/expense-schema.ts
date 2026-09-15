import { z } from "zod";

import { CATEGORY_IDS, type ProgramSettings } from "@/lib/domain/types";
import { isDateWithinProgram, programStartDate, programEndDate } from "@/lib/domain/week";
import { format } from "date-fns";

export const expenseFormBaseSchema = z.object({
  date: z.string().min(1, "Pick a date"),
  amount: z
    .number({ error: "Enter an amount" })
    .positive("Amount must be greater than $0")
    .max(999_999, "That amount looks too large"),
  category: z.enum(CATEGORY_IDS),
  description: z.string().trim().min(1, "Add a short description").max(200, "Keep it under 200 characters"),
  subcategory: z.string().trim().max(80).optional().or(z.literal("")),
  paymentMethod: z.string().trim().max(80).optional().or(z.literal("")),
});

export type ExpenseFormValues = z.infer<typeof expenseFormBaseSchema>;

/**
 * The date-range check depends on the current program settings, so this is
 * a schema *factory* rather than a static schema — the program is captured
 * once per form instance and every validation run uses the same rule the
 * date picker itself is constrained to.
 */
export function buildExpenseSchema(program: ProgramSettings) {
  return expenseFormBaseSchema.superRefine((values, ctx) => {
    const date = new Date(values.date);
    if (Number.isNaN(date.getTime()) || !isDateWithinProgram(program, date)) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: `Date must fall within the program (${format(programStartDate(program), "MMM d, yyyy")} – ${format(programEndDate(program), "MMM d, yyyy")})`,
      });
    }
  });
}

import { z } from "zod";

import { WEEK_BOUNDARIES } from "@/lib/domain/types";

export const familyProgramSchema = z.object({
  familyName: z.string().trim().min(1, "Enter a family name").max(80, "Keep it under 80 characters"),
  startDate: z.string().min(1, "Pick a start date"),
  lengthWeeks: z
    .number({ error: "Enter the program length" })
    .int("Whole weeks only")
    .min(1, "At least 1 week")
    .max(52, "52 weeks max"),
  weekBoundary: z.enum(WEEK_BOUNDARIES),
});

export type FamilyProgramFormValues = z.infer<typeof familyProgramSchema>;

export const budgetSchema = z.object({
  weeklyBudget: z
    .union([z.number().nonnegative("Must be $0 or more"), z.nan()])
    .optional(),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;

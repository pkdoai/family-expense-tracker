import type { BudgetStatus } from "@/lib/domain/types";

/**
 * Classify actual spend against the spending plan. Thresholds are
 * centralized here so the dashboard chip, the trend chart's point colors,
 * and the alert toast all agree: a warning from 90% of the plan, over-plan
 * past 100%.
 */
export const WARNING_RATIO = 0.9;

export function computeBudgetStatus(actualCents: number, targetCents: number): BudgetStatus {
  if (targetCents <= 0) return "good";
  const ratio = actualCents / targetCents;
  if (ratio > 1) return "critical";
  if (ratio >= WARNING_RATIO) return "warning";
  return "good";
}

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  good: "On track",
  warning: "Approaching plan",
  critical: "Over plan",
};

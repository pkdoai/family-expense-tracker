import type { BudgetStatus } from "@/lib/domain/types";

/**
 * Classify actual spend against a target. Thresholds are centralized here
 * so the dashboard chip, the trend chart's point colors, and any future
 * alerting all agree on what "close" and "over" mean.
 */
export function computeBudgetStatus(actualCents: number, targetCents: number): BudgetStatus {
  if (targetCents <= 0) return "good";
  const ratio = actualCents / targetCents;
  if (ratio <= 1) return "good";
  if (ratio <= 1.2) return "warning";
  return "critical";
}

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  good: "On track",
  warning: "Approaching budget",
  critical: "Over budget",
};

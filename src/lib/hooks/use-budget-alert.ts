"use client";

import * as React from "react";
import { toast } from "sonner";

import { computeBudgetStatus, BUDGET_STATUS_LABEL } from "@/lib/domain/budget-status";
import { formatCents } from "@/lib/domain/currency";

/**
 * Surfaces a toast the moment the current week's spending crosses into
 * "approaching" or "over" budget — not just the passive dashboard chip.
 * Deduped per week+status per session so it doesn't re-fire on every
 * render or every navigation back to the dashboard.
 */
export function useBudgetAlert(weekNumber: number | null, actualCents: number, targetCents: number | null) {
  const firedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!weekNumber || !targetCents || targetCents <= 0) return;
    const status = computeBudgetStatus(actualCents, targetCents);
    if (status === "good") return;

    const key = `${weekNumber}:${status}`;
    if (firedRef.current.has(key)) return;
    firedRef.current.add(key);

    const message =
      status === "critical"
        ? `Week ${weekNumber} is over budget — ${formatCents(actualCents)} of ${formatCents(targetCents)}`
        : `Week ${weekNumber} is ${BUDGET_STATUS_LABEL[status].toLowerCase()} — ${formatCents(actualCents)} of ${formatCents(targetCents)}`;

    toast(message, { description: status === "critical" ? "Over the weekly target." : "Getting close to the weekly target." });
  }, [weekNumber, actualCents, targetCents]);
}

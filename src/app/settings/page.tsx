"use client";

import { SpendingPlanCard } from "@/components/settings/spending-plan-card";
import { DataTools } from "@/components/settings/data-tools";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Your spending plan spreadsheet and your data.</p>
      </div>

      <SpendingPlanCard />
      <DataTools />
    </div>
  );
}

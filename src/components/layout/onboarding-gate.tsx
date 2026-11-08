"use client";

import { FileSpreadsheet } from "lucide-react";
import { usePathname } from "next/navigation";

import { useSettings } from "@/lib/hooks/use-settings";
import { useWorkbook } from "@/lib/hooks/use-workbook";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadWorkbookButton } from "@/components/shared/load-workbook-button";

/**
 * Every screen except Settings waits for the family's spending plan to be
 * loaded: the categories, dates and plan amounts all come from it, so there
 * is nothing meaningful to show before that.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { loaded } = useSettings();
  const { ready, record } = useWorkbook();
  const pathname = usePathname();

  if (!loaded || !ready) return null;

  if (!record && pathname !== "/settings") {
    return (
      <div className="mx-auto flex max-w-lg flex-1 items-center px-4 py-16">
        <EmptyState
          icon={FileSpreadsheet}
          title="Load your spending plan"
          description="Pick your family's Weekly Spending Plan spreadsheet (.xlsx) from your Teams folder. The app uses its categories and dates, and saves your entries back into it."
          action={<LoadWorkbookButton />}
        />
      </div>
    );
  }

  return <>{children}</>;
}

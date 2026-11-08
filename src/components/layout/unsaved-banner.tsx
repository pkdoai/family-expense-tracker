"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudUpload } from "lucide-react";

import { usePendingChanges } from "@/lib/hooks/use-pending-changes";

/** A thin reminder, shown on every screen, while entries haven't been saved into the spreadsheet. */
export function UnsavedBanner() {
  const pending = usePendingChanges();
  const pathname = usePathname();
  if (pending === 0 || pathname === "/settings") return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-status-warning-bg px-4 py-1.5 text-xs text-status-warning">
      <CloudUpload className="size-3.5 shrink-0" />
      <span>
        {pending} change{pending === 1 ? "" : "s"} not saved to your spreadsheet yet.
      </span>
      <Link href="/settings#spending-plan" className="font-semibold underline underline-offset-2">
        Finish &amp; save
      </Link>
    </div>
  );
}

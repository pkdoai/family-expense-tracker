"use client";

import { format } from "date-fns";

import { useSettings } from "@/lib/hooks/use-settings";
import { getProgramProgress, programStartDate, programEndDate } from "@/lib/domain/week";
import { Progress } from "@/components/ui/progress";

export function ProgramProgress() {
  const { settings } = useSettings();
  const progress = getProgramProgress(settings.program);
  const start = programStartDate(settings.program);
  const end = programEndDate(settings.program);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border bg-muted/60 px-4 py-2.5 sm:px-6">
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-semibold">
          {progress.hasStarted
            ? `Week ${progress.currentWeek} of ${settings.program.lengthWeeks}`
            : `Starts ${format(start, "MMM d, yyyy")}`}
        </span>
        <span className="text-xs text-muted-foreground">
          &middot; program runs {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <Progress value={progress.percentComplete} className="h-1.5 w-36" />
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {progress.hasEnded ? "Program complete" : `${progress.daysRemaining} days remaining`}
        </span>
      </div>
    </div>
  );
}

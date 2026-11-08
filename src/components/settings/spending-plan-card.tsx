"use client";

import * as React from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { FileCheck2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadWorkbookButton } from "@/components/shared/load-workbook-button";
import { FinishSaveDialog } from "@/components/settings/finish-save-dialog";
import { useWorkbook } from "@/lib/hooks/use-workbook";
import { usePendingChanges } from "@/lib/hooks/use-pending-changes";

export function SpendingPlanCard() {
  const { record, summary } = useWorkbook();
  const pending = usePendingChanges();
  const [finishOpen, setFinishOpen] = React.useState(false);

  if (!record || !summary) {
    return (
      <Card id="spending-plan">
        <CardHeader>
          <CardTitle>Spending Plan</CardTitle>
          <CardDescription>
            Load your family&rsquo;s Weekly Spending Plan spreadsheet (.xlsx). The app reads your family name, dates and
            categories from it and writes your entries back into it.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <LoadWorkbookButton />
        </CardFooter>
      </Card>
    );
  }

  const first = summary.weeks[0];
  const last = summary.weeks[summary.weeks.length - 1];

  return (
    <Card id="spending-plan">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-primary" />
          Spending Plan
        </CardTitle>
        <CardDescription>
          {record.fileName} &middot; {summary.familyName || "Family"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Program: </span>
          {format(parseISO(first.start), "MMM d, yyyy")} – {format(parseISO(last.end), "MMM d, yyyy")} (Week{" "}
          {first.number} to Week {last.number})
        </p>
        <p>
          <span className="text-muted-foreground">Last saved to your spreadsheet: </span>
          {record.savedAt ? `${formatDistanceToNow(parseISO(record.savedAt))} ago` : "not yet"}
        </p>
        <p className={pending > 0 ? "font-medium text-status-warning" : "text-muted-foreground"}>
          {pending > 0
            ? `${pending} change${pending === 1 ? "" : "s"} not saved to the spreadsheet yet — save at least once a week.`
            : "Everything is saved to the spreadsheet."}
        </p>
        <p className="pt-1 text-xs text-muted-foreground">
          The family name and week dates come from the spreadsheet and can&rsquo;t be changed here. To correct them,
          finish &amp; save, fix the spreadsheet, then load it again.
        </p>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button onClick={() => setFinishOpen(true)}>
          <Save className="size-4" />
          Finish &amp; save
        </Button>
        <LoadWorkbookButton label="Load a different copy" variant="outline" />
      </CardFooter>
      <FinishSaveDialog open={finishOpen} onOpenChange={setFinishOpen} />
    </Card>
  );
}

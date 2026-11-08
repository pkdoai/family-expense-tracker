"use client";

import * as React from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkbook, type LoadInspection } from "@/lib/hooks/use-workbook";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { backupService } from "@/lib/storage/repositories";
import { WorkbookError } from "@/lib/workbook";

/**
 * Picks a spending plan (.xlsx) and loads it. Anything that would throw away
 * the family's entries — or load a copy that's missing some — is explained
 * first, and a JSON backup is offered before anything is replaced.
 */
export function LoadWorkbookButton({
  label = "Load spending plan",
  variant = "default",
}: {
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { inspectFile, applyLoad } = useWorkbook();
  const { reload } = useExpenses();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState<LoadInspection | null>(null);

  async function finish(inspection: LoadInspection, rewriteMissing: boolean) {
    setBusy(true);
    try {
      await applyLoad(inspection, { rewriteMissing });
      await reload();
      toast.success(`Loaded ${inspection.fileName}`);
      setPending(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load that file.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const inspection = await inspectFile(file);
      const needsQuestion =
        (inspection.kind !== "same" && inspection.existingExpenseCount > 0) ||
        (inspection.kind === "same" && inspection.missing.length > 0);
      if (needsQuestion) setPending(inspection);
      else await finish(inspection, false);
    } catch (err) {
      toast.error(err instanceof WorkbookError ? err.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadBackup() {
    try {
      const { blob, filename } = await backupService.exportToFile();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Couldn't create a backup — please try again.");
    }
  }

  const replacing = pending && pending.kind !== "same";

  return (
    <>
      <Button variant={variant} onClick={() => inputRef.current?.click()} disabled={busy}>
        <FileSpreadsheet className="size-4" />
        {busy ? "Working…" : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={onFile}
      />

      <Dialog open={Boolean(pending)} onOpenChange={(o) => !o && !busy && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          {pending && replacing && (
            <>
              <DialogHeader>
                <DialogTitle>Replace what&rsquo;s in the app?</DialogTitle>
                <DialogDescription>
                  {pending.existingExpenseCount} entr{pending.existingExpenseCount === 1 ? "y" : "ies"} on this device will
                  be removed and replaced by this spreadsheet. Download a backup first if you might need them.
                </DialogDescription>
              </DialogHeader>
              <Button variant="outline" onClick={downloadBackup}>
                <Download className="size-4" />
                Download a backup first
              </Button>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => finish(pending, false)} disabled={busy}>
                  Replace
                </Button>
              </DialogFooter>
            </>
          )}
          {pending && !replacing && (
            <>
              <DialogHeader>
                <DialogTitle>This copy looks older</DialogTitle>
                <DialogDescription>
                  {pending.missing.length} entr{pending.missing.length === 1 ? "y" : "ies"} the app already saved
                  {pending.missing.length === 1 ? " isn't" : " aren't"} in this file. You may have picked an older copy
                  from Teams. You can add them back into this copy, or load it as it is.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
                <Button onClick={() => finish(pending, true)} disabled={busy}>
                  Add them back to this copy
                </Button>
                <Button variant="outline" onClick={() => finish(pending, false)} disabled={busy}>
                  Load it as it is
                </Button>
                <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

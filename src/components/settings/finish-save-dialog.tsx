"use client";

import * as React from "react";
import { Download, Share2 } from "lucide-react";
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
import { useWorkbook, type UpdatedFile } from "@/lib/hooks/use-workbook";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { XLSX_MIME } from "@/lib/workbook";

function triggerDownload(file: UpdatedFile) {
  const blob = new Blob([file.bytes as BlobPart], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Two steps, on purpose: build + hand over the updated spreadsheet, then ask
 * the family to confirm it was saved over the old copy. Only that confirmation
 * marks entries as saved — a download that never got saved can't silently
 * lose entries.
 */
export function FinishSaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { buildUpdatedFile, saveBase } = useWorkbook();
  const { markAllCommitted } = useExpenses();
  const [file, setFile] = React.useState<UpdatedFile | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Build the updated file each time the dialog opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFile(null);
    setError(null);
    setBusy(true);
    buildUpdatedFile()
      .then((built) => {
        if (cancelled) return;
        setFile(built);
        triggerDownload(built);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't build the spreadsheet."))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [open, buildUpdatedFile]);

  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    file !== null &&
    navigator.canShare({ files: [new File([file.bytes as BlobPart], file.fileName, { type: XLSX_MIME })] });

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [new File([file.bytes as BlobPart], file.fileName, { type: XLSX_MIME })] });
    } catch {
      /* the person closed the share sheet */
    }
  }

  async function confirmSaved() {
    if (!file) return;
    setBusy(true);
    try {
      await saveBase(file.bytes);
      await markAllCommitted();
      toast.success("Saved — everything is now in your spreadsheet");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't record that — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finish &amp; save</DialogTitle>
          <DialogDescription>
            {error
              ? "The spreadsheet couldn't be updated."
              : file
                ? `Your updated spreadsheet (${file.fileName}) was downloaded. Save it over the old copy in your Teams folder, then tap “I saved it”.`
                : "Updating your spreadsheet…"}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {file && file.warnings.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {file.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
          {file && (
            <>
              <Button onClick={confirmSaved} disabled={busy}>
                I saved it
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => triggerDownload(file)} disabled={busy}>
                  <Download className="size-4" />
                  Download again
                </Button>
                {canShare && (
                  <Button variant="outline" className="flex-1" onClick={share} disabled={busy}>
                    <Share2 className="size-4" />
                    Share…
                  </Button>
                )}
              </div>
            </>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {file ? "Not yet" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

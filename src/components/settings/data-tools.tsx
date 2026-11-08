"use client";

import * as React from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { useExpenses } from "@/lib/hooks/use-expenses";
import { backupService } from "@/lib/storage/repositories";

export function DataTools() {
  const { clearAll } = useExpenses();
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [confirmRestore, setConfirmRestore] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const restoreInputRef = React.useRef<HTMLInputElement>(null);

  async function handleClearAll() {
    setBusy(true);
    try {
      await clearAll();
      toast.success("All expenses cleared");
    } catch {
      toast.error("Couldn't clear data — please try again.");
    } finally {
      setBusy(false);
      setConfirmClear(false);
    }
  }

  async function handleExportBackup() {
    setBusy(true);
    try {
      const { blob, filename } = await backupService.exportToFile();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Couldn't create a backup — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleRestoreFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setConfirmRestore(file);
  }

  async function handleRestoreConfirmed() {
    if (!confirmRestore) return;
    setBusy(true);
    try {
      await backupService.importFromFile(confirmRestore);
      toast.success("Backup restored — reloading…");
      // Settings live outside React state (localStorage) and photos/expenses
      // were rewritten directly in IndexedDB, so a full reload is the
      // simplest way to get every provider back in sync with the restore.
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restore that backup file.");
      setBusy(false);
    } finally {
      setConfirmRestore(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Backup &amp; Restore</CardTitle>
          <CardDescription>
            Export everything — entries, receipt photos, and the loaded spreadsheet — as a JSON file, or restore from a
            previous backup. Useful before clearing your browser or moving to a new phone.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button variant="outline" onClick={handleExportBackup} disabled={busy}>
            <Download className="size-3.5" />
            Export backup
          </Button>
          <Button variant="outline" onClick={() => restoreInputRef.current?.click()} disabled={busy}>
            <Upload className="size-3.5" />
            Restore from file
          </Button>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleRestoreFileSelect}
          />
        </CardFooter>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Remove every entry, receipt photo and the loaded spreadsheet from this device. Anything you already saved into your spreadsheet stays in it.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={() => setConfirmClear(true)} disabled={busy}>
            <Trash2 className="size-3.5" />
            Clear all data
          </Button>
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description="This removes every entry, receipt photo and the loaded spreadsheet from this device. Entries already saved into your spreadsheet stay in it, but anything not yet saved is lost. Export a backup first if unsure."
        confirmLabel="Clear all data"
        destructive
        onConfirm={handleClearAll}
      />

      <ConfirmDialog
        open={Boolean(confirmRestore)}
        onOpenChange={(o) => !o && setConfirmRestore(null)}
        title="Restore this backup?"
        description="This replaces all current expenses, receipt photos, and settings with the contents of the backup file. This can't be undone."
        confirmLabel="Restore backup"
        destructive
        onConfirm={handleRestoreConfirmed}
      />
    </>
  );
}

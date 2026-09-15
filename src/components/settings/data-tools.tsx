"use client";

import * as React from "react";
import { Sparkles, Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { useSettings } from "@/lib/hooks/use-settings";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { generateSampleExpenses } from "@/lib/storage/sample-data";
import { backupService } from "@/lib/storage/repositories";

export function DataTools() {
  const { settings } = useSettings();
  const { replaceAll, clearAll, expenses } = useExpenses();
  const [confirmSample, setConfirmSample] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [confirmRestore, setConfirmRestore] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const restoreInputRef = React.useRef<HTMLInputElement>(null);

  async function loadSampleData() {
    setBusy(true);
    try {
      const sample = generateSampleExpenses(settings.program);
      await replaceAll(sample);
      toast.success(`Loaded ${sample.length} sample expenses`);
    } catch {
      toast.error("Couldn't load sample data — please try again.");
    } finally {
      setBusy(false);
      setConfirmSample(false);
    }
  }

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
          <CardTitle>Sample Data</CardTitle>
          <CardDescription>
            Preview the dashboard and charts with realistic sample expenses spread across your program so far.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => setConfirmSample(true)} disabled={busy}>
            <Sparkles className="size-3.5" />
            Load sample data
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup &amp; Restore</CardTitle>
          <CardDescription>
            Export everything — expenses, receipt photos, and settings — as a JSON file, or restore from a previous
            backup. Useful before clearing your browser or moving to a new device.
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
          <CardDescription>Permanently delete every expense and receipt photo. Settings are kept.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={() => setConfirmClear(true)} disabled={busy || expenses.length === 0}>
            <Trash2 className="size-3.5" />
            Clear all data
          </Button>
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={confirmSample}
        onOpenChange={setConfirmSample}
        title="Load sample data?"
        description="This replaces any existing expenses with generated sample data. Export a backup first if you want to keep what's there now."
        confirmLabel="Load sample data"
        destructive={expenses.length > 0}
        onConfirm={loadSampleData}
      />

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description="This permanently deletes every expense and receipt photo. This can't be undone."
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

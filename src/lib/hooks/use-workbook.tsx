"use client";

import * as React from "react";

import { CategoryIndex, EMPTY_CATEGORY_INDEX } from "@/lib/domain/categories";
import type { Expense } from "@/lib/domain/types";
import { expenseRepository, photoRepository, workbookRepository } from "@/lib/storage/repositories";
import type { WorkbookRecord } from "@/lib/storage/workbook-repository";
import { useSettings } from "@/lib/hooks/use-settings";
import {
  XlsxPackage,
  applyChanges,
  findMissingWrites,
  readWorkbookSummary,
  writesEqual,
  type SheetWrite,
  type WorkbookSummary,
} from "@/lib/workbook";

export type LoadKind = "first" | "same" | "different";

export interface LoadInspection {
  fileName: string;
  bytes: ArrayBuffer;
  summary: WorkbookSummary;
  /**
   * first: nothing loaded yet. same: this program (same start date) is already loaded.
   * different: another program — loading it replaces everything in the app.
   */
  kind: LoadKind;
  existingExpenseCount: number;
  /** Entries the app already saved that this copy of the file doesn't contain (an older copy?). */
  missing: SheetWrite[];
}

export interface UpdatedFile {
  bytes: Uint8Array;
  fileName: string;
  warnings: string[];
}

interface WorkbookContextValue {
  /** True once IndexedDB has been read, so screens don't flash the "load your plan" state. */
  ready: boolean;
  record: WorkbookRecord | null;
  summary: WorkbookSummary | null;
  categories: CategoryIndex;
  inspectFile: (file: File) => Promise<LoadInspection>;
  applyLoad: (inspection: LoadInspection, options: { rewriteMissing: boolean }) => Promise<void>;
  buildUpdatedFile: () => Promise<UpdatedFile>;
  /** Make `bytes` the new saved copy: the baseline for later changes. */
  saveBase: (bytes: Uint8Array) => Promise<void>;
  addPendingRemoval: (write: SheetWrite) => Promise<void>;
  reload: () => Promise<void>;
}

const WorkbookContext = React.createContext<WorkbookContextValue | null>(null);

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function WorkbookProvider({ children }: { children: React.ReactNode }) {
  const { settings, replaceAll: replaceSettings } = useSettings();
  const [record, setRecord] = React.useState<WorkbookRecord | null>(null);
  const [ready, setReady] = React.useState(false);
  // Serialises read-modify-write changes to the stored record (e.g. two quick deletes).
  const queue = React.useRef<Promise<unknown>>(Promise.resolve());

  const reload = React.useCallback(async () => {
    setRecord((await workbookRepository.get()) ?? null);
    setReady(true);
  }, []);

  React.useEffect(() => {
    // IndexedDB can only be read on the client after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const inspectFile = React.useCallback(
    async (file: File): Promise<LoadInspection> => {
      const bytes = await file.arrayBuffer();
      const pkg = await XlsxPackage.open(bytes);
      const summary = await readWorkbookSummary(pkg);
      const existing = await workbookRepository.get();
      const expenses = await expenseRepository.list();

      let kind: LoadKind = "first";
      let missing: SheetWrite[] = [];
      if (existing) {
        kind = existing.summary.startDate === summary.startDate ? "same" : "different";
        if (kind === "same") {
          const committed = expenses.map((e) => e.committed).filter((w): w is SheetWrite => Boolean(w));
          missing = await findMissingWrites(pkg, committed);
        }
      }
      return { fileName: file.name, bytes, summary, kind, existingExpenseCount: expenses.length, missing };
    },
    [],
  );

  const applyLoad = React.useCallback(
    async (inspection: LoadInspection, options: { rewriteMissing: boolean }) => {
      const { summary } = inspection;
      const existing = await workbookRepository.get();

      if (inspection.kind === "same" && existing) {
        if (options.rewriteMissing && inspection.missing.length > 0) {
          // Treat the missing entries as not yet saved, so the next Finish & save adds them back.
          const expenses = await expenseRepository.list();
          const remaining = [...inspection.missing];
          const updated: Expense[] = expenses.map((e) => {
            const i = remaining.findIndex((w) => writesEqual(w, e.committed));
            if (i === -1) return e;
            remaining.splice(i, 1);
            return { ...e, committed: null };
          });
          await expenseRepository.bulkReplace(updated);
        }
        await workbookRepository.put({
          fileName: inspection.fileName,
          base: inspection.bytes,
          summary,
          loadedAt: new Date().toISOString(),
          savedAt: existing.savedAt,
          pendingRemovals: existing.pendingRemovals,
        });
      } else {
        // A different program (or the first load): start clean.
        await expenseRepository.clear();
        await photoRepository.clear();
        await workbookRepository.put({
          fileName: inspection.fileName,
          base: inspection.bytes,
          summary,
          loadedAt: new Date().toISOString(),
          savedAt: null,
          pendingRemovals: [],
        });
      }

      replaceSettings({
        ...settings,
        family: { familyName: summary.familyName || settings.family.familyName },
        program: {
          startDate: summary.startDate,
          lengthWeeks: summary.weeks.length,
          weekBoundary: settings.program.weekBoundary,
          fixedWeeks: true,
        },
        onboarded: true,
      });

      // Ask the browser not to evict the app's data — it can't be rebuilt if lost. Best effort only.
      try {
        await navigator.storage?.persist?.();
      } catch {
        /* not supported */
      }
      await reload();
    },
    [settings, replaceSettings, reload],
  );

  const buildUpdatedFile = React.useCallback(async (): Promise<UpdatedFile> => {
    const current = await workbookRepository.get();
    if (!current) throw new Error("No spending plan is loaded.");
    const expenses = await expenseRepository.list();

    const removals: SheetWrite[] = [...current.pendingRemovals];
    const additions: SheetWrite[] = [];
    // Oldest first, so a cell's formula reads in the order things were entered.
    const ordered = [...expenses].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.date.localeCompare(b.date),
    );
    for (const e of ordered) {
      if (writesEqual(e.committed, e.write)) continue;
      if (e.committed) removals.push(e.committed);
      if (e.write) additions.push(e.write);
    }

    const pkg = await XlsxPackage.open(current.base);
    const { warnings } = await applyChanges(pkg, { remove: removals, add: additions });
    return { bytes: await pkg.save(), fileName: current.fileName, warnings };
  }, []);

  const saveBase = React.useCallback(
    (bytes: Uint8Array) => {
      const run = async () => {
        const current = await workbookRepository.get();
        if (!current) return;
        await workbookRepository.put({
          ...current,
          base: toArrayBuffer(bytes),
          savedAt: new Date().toISOString(),
          pendingRemovals: [],
        });
        await reload();
      };
      queue.current = queue.current.then(run, run);
      return queue.current as Promise<void>;
    },
    [reload],
  );

  const addPendingRemoval = React.useCallback(
    (write: SheetWrite) => {
      const run = async () => {
        const current = await workbookRepository.get();
        if (!current) return;
        await workbookRepository.put({ ...current, pendingRemovals: [...current.pendingRemovals, write] });
        await reload();
      };
      queue.current = queue.current.then(run, run);
      return queue.current as Promise<void>;
    },
    [reload],
  );

  const categories = React.useMemo(
    () => (record ? new CategoryIndex(record.summary.categories) : EMPTY_CATEGORY_INDEX),
    [record],
  );

  const value = React.useMemo<WorkbookContextValue>(
    () => ({
      ready,
      record,
      summary: record?.summary ?? null,
      categories,
      inspectFile,
      applyLoad,
      buildUpdatedFile,
      saveBase,
      addPendingRemoval,
      reload,
    }),
    [ready, record, categories, inspectFile, applyLoad, buildUpdatedFile, saveBase, addPendingRemoval, reload],
  );

  return <WorkbookContext.Provider value={value}>{children}</WorkbookContext.Provider>;
}

export function useWorkbook(): WorkbookContextValue {
  const ctx = React.useContext(WorkbookContext);
  if (!ctx) throw new Error("useWorkbook must be used within a WorkbookProvider");
  return ctx;
}

export function useCategories(): CategoryIndex {
  return useWorkbook().categories;
}

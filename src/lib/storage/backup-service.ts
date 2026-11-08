import type { AppSettings, Expense, ExpensePhoto } from "@/lib/domain/types";
import type { ExpenseRepository } from "@/lib/storage/expense-repository";
import type { PhotoRepository } from "@/lib/storage/photo-repository";
import type { SettingsRepository } from "@/lib/storage/settings-repository";
import type { WorkbookRepository } from "@/lib/storage/workbook-repository";
import type { SheetWrite, WorkbookSummary } from "@/lib/workbook/types";
import { getDb } from "@/lib/storage/db";

const BACKUP_VERSION = 2;

interface SerializedPhoto {
  id: string;
  expenseId: string;
  contentType: string;
  createdAt: string;
  dataBase64: string;
}

interface SerializedWorkbook {
  fileName: string;
  dataBase64: string;
  summary: WorkbookSummary;
  loadedAt: string;
  savedAt: string | null;
  pendingRemovals: SheetWrite[];
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  expenses: Expense[];
  photos: SerializedPhoto[];
  /** Added in version 2; absent in older backups. */
  workbook?: SerializedWorkbook | null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64ToBlob(base64: string, contentType: string): Blob {
  return new Blob([base64ToBytes(base64)], { type: contentType });
}

/**
 * Full-fidelity JSON export/import — the safety net for a cleared browser
 * cache or moving to a new device. Depends only on the repository
 * interfaces (dependency inversion), so it never touches IndexedDB or
 * localStorage directly.
 */
export class BackupService {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly photos: PhotoRepository,
    private readonly settings: SettingsRepository,
    private readonly workbooks: WorkbookRepository,
  ) {}

  async export(): Promise<BackupPayload> {
    const expenseList = await this.expenses.list();
    const db = await getDb();
    const allPhotos = await db.getAll("photos");
    const serializedPhotos: SerializedPhoto[] = await Promise.all(
      allPhotos.map(async (p: ExpensePhoto) => ({
        id: p.id,
        expenseId: p.expenseId,
        contentType: p.contentType,
        createdAt: p.createdAt,
        dataBase64: await blobToBase64(p.blob),
      })),
    );

    const wb = await this.workbooks.get();

    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: this.settings.get(),
      expenses: expenseList,
      photos: serializedPhotos,
      workbook: wb
        ? {
            fileName: wb.fileName,
            dataBase64: bytesToBase64(new Uint8Array(wb.base)),
            summary: wb.summary,
            loadedAt: wb.loadedAt,
            savedAt: wb.savedAt,
            pendingRemovals: wb.pendingRemovals,
          }
        : null,
    };
  }

  async exportToFile(): Promise<{ blob: Blob; filename: string }> {
    const payload = await this.export();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const slug = (payload.settings.family.familyName || "family")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const filename = `${slug}-backup-${payload.exportedAt.slice(0, 10)}.json`;
    return { blob, filename };
  }

  async import(payload: BackupPayload): Promise<void> {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.expenses)) {
      throw new Error("This file doesn't look like a valid backup.");
    }

    this.settings.set(payload.settings);
    await this.expenses.bulkReplace(payload.expenses);

    const db = await getDb();
    const tx = db.transaction("photos", "readwrite");
    await tx.store.clear();
    for (const p of payload.photos ?? []) {
      await tx.store.put({
        id: p.id,
        expenseId: p.expenseId,
        contentType: p.contentType,
        createdAt: p.createdAt,
        blob: base64ToBlob(p.dataBase64, p.contentType),
      });
    }
    await tx.done;

    if (payload.workbook) {
      const w = payload.workbook;
      await this.workbooks.put({
        fileName: w.fileName,
        base: base64ToBytes(w.dataBase64).buffer,
        summary: w.summary,
        loadedAt: w.loadedAt,
        savedAt: w.savedAt,
        pendingRemovals: w.pendingRemovals ?? [],
      });
    } else {
      await this.workbooks.clear();
    }
  }

  async importFromFile(file: File): Promise<void> {
    const text = await file.text();
    let parsed: BackupPayload;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("This file isn't valid JSON.");
    }
    await this.import(parsed);
  }
}

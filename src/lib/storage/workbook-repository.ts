import { getDb } from "@/lib/storage/db";
import type { SheetWrite, WorkbookSummary } from "@/lib/workbook/types";

const CURRENT = "current";

/**
 * The loaded spending plan. `base` is the workbook exactly as last loaded or
 * last saved by the app; entries not yet in it are applied on top of it when
 * the family taps "Finish & save", so nothing is ever rewritten until then.
 */
export interface WorkbookRecord {
  id: typeof CURRENT;
  fileName: string;
  base: ArrayBuffer;
  summary: WorkbookSummary;
  loadedAt: string;
  /** When the family last confirmed saving the updated file; null if never. */
  savedAt: string | null;
  /** Entries deleted after they were already saved into `base` — their terms still need removing. */
  pendingRemovals: SheetWrite[];
}

export interface WorkbookRepository {
  get(): Promise<WorkbookRecord | undefined>;
  put(record: Omit<WorkbookRecord, "id">): Promise<WorkbookRecord>;
  clear(): Promise<void>;
}

export class IndexedDbWorkbookRepository implements WorkbookRepository {
  async get(): Promise<WorkbookRecord | undefined> {
    const db = await getDb();
    return db.get("workbook", CURRENT);
  }

  async put(record: Omit<WorkbookRecord, "id">): Promise<WorkbookRecord> {
    const db = await getDb();
    const full: WorkbookRecord = { ...record, id: CURRENT };
    await db.put("workbook", full);
    return full;
  }

  async clear(): Promise<void> {
    const db = await getDb();
    await db.clear("workbook");
  }
}

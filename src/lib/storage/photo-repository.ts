import { getDb } from "@/lib/storage/db";
import type { ExpensePhoto } from "@/lib/domain/types";

export interface PhotoRepository {
  add(expenseId: string, file: Blob): Promise<ExpensePhoto>;
  listByExpense(expenseId: string): Promise<ExpensePhoto[]>;
  remove(id: string): Promise<void>;
  removeByExpense(expenseId: string): Promise<void>;
  clear(): Promise<void>;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class IndexedDbPhotoRepository implements PhotoRepository {
  async add(expenseId: string, file: Blob): Promise<ExpensePhoto> {
    const db = await getDb();
    const photo: ExpensePhoto = {
      id: newId(),
      expenseId,
      blob: file,
      contentType: file.type || "image/jpeg",
      createdAt: new Date().toISOString(),
    };
    await db.put("photos", photo);
    return photo;
  }

  async listByExpense(expenseId: string): Promise<ExpensePhoto[]> {
    const db = await getDb();
    return db.getAllFromIndex("photos", "by-expense", expenseId);
  }

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete("photos", id);
  }

  async removeByExpense(expenseId: string): Promise<void> {
    const db = await getDb();
    const photos = await this.listByExpense(expenseId);
    const tx = db.transaction("photos", "readwrite");
    await Promise.all(photos.map((p) => tx.store.delete(p.id)));
    await tx.done;
  }

  async clear(): Promise<void> {
    const db = await getDb();
    await db.clear("photos");
  }
}

/** In-memory object-URL cache so the same photo doesn't get re-encoded per render. */
const urlCache = new Map<string, string>();

export function photoObjectUrl(photo: ExpensePhoto): string {
  const cached = urlCache.get(photo.id);
  if (cached) return cached;
  const url = URL.createObjectURL(photo.blob);
  urlCache.set(photo.id, url);
  return url;
}

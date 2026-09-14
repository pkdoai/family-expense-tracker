import { IndexedDbExpenseRepository } from "@/lib/storage/expense-repository";
import { IndexedDbPhotoRepository } from "@/lib/storage/photo-repository";
import { LocalStorageSettingsRepository } from "@/lib/storage/settings-repository";
import { BackupService } from "@/lib/storage/backup-service";

/**
 * The app's single composition point: concrete implementations are
 * instantiated once, here, and everything else (hooks, services)
 * depends only on the interfaces they implement. Swapping storage
 * technology later means editing this file alone.
 */
export const expenseRepository = new IndexedDbExpenseRepository();
export const photoRepository = new IndexedDbPhotoRepository();
export const settingsRepository = new LocalStorageSettingsRepository();
export const backupService = new BackupService(expenseRepository, photoRepository, settingsRepository);

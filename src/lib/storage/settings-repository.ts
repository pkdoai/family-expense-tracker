import type { AppSettings } from "@/lib/domain/types";

const STORAGE_KEY = "family-expense-tracker:settings";

export const DEFAULT_SETTINGS: AppSettings = {
  family: { familyName: "" },
  program: {
    startDate: new Date().toISOString().slice(0, 10),
    lengthWeeks: 16,
    weekBoundary: "sunday",
  },
  budget: { weeklyBudgetCents: null },
  onboarded: false,
};

/**
 * Settings are small and read constantly (every page reads program dates),
 * so they live in localStorage rather than IndexedDB — synchronous, no
 * connection to open, per the product's storage decision.
 */
export interface SettingsRepository {
  get(): AppSettings;
  set(settings: AppSettings): void;
  clear(): void;
}

export class LocalStorageSettingsRepository implements SettingsRepository {
  get(): AppSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw) as AppSettings;
      // Merge with defaults so a future settings field never crashes an older save.
      return {
        family: { ...DEFAULT_SETTINGS.family, ...parsed.family },
        program: { ...DEFAULT_SETTINGS.program, ...parsed.program },
        budget: { ...DEFAULT_SETTINGS.budget, ...parsed.budget },
        onboarded: parsed.onboarded ?? false,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  set(settings: AppSettings): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

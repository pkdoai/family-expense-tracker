"use client";

import * as React from "react";

import type { AppSettings, FamilySettings, ProgramSettings, BudgetSettings } from "@/lib/domain/types";
import { settingsRepository } from "@/lib/storage/repositories";
import { DEFAULT_SETTINGS } from "@/lib/storage/settings-repository";

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  updateFamily: (family: FamilySettings) => void;
  updateProgram: (program: ProgramSettings) => void;
  updateBudget: (budget: BudgetSettings) => void;
  completeOnboarding: () => void;
  replaceAll: (settings: AppSettings) => void;
  resetToDefaults: () => void;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    // Settings live in localStorage, which isn't available during SSR/static
    // prerendering — this one-time client-only read after mount (rather than
    // a lazy useState initializer) is what keeps the prerendered HTML and
    // the first client render identical, avoiding a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(settingsRepository.get());
    setLoaded(true);
  }, []);

  // Takes an updater (not a precomputed object) and folds it through React's
  // *pending* state via the setState callback form. This matters because a
  // single form submit calls several of the update* methods back-to-back
  // (e.g. updateFamily, then updateProgram, then completeOnboarding) — with
  // a plain `{ ...settings, x }` each call would close over the same stale
  // `settings` from render and the later calls would clobber the earlier
  // ones. Folding through `prev` chains them correctly, and writing to the
  // repository inside the updater keeps localStorage in sync with exactly
  // what React ends up committing.
  const persist = React.useCallback((updater: (prev: AppSettings) => AppSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      settingsRepository.set(next);
      return next;
    });
  }, []);

  const value = React.useMemo<SettingsContextValue>(
    () => ({
      settings,
      loaded,
      updateFamily: (family) => persist((prev) => ({ ...prev, family })),
      updateProgram: (program) => persist((prev) => ({ ...prev, program })),
      updateBudget: (budget) => persist((prev) => ({ ...prev, budget })),
      completeOnboarding: () => persist((prev) => ({ ...prev, onboarded: true })),
      replaceAll: (next) => persist(() => next),
      resetToDefaults: () => persist(() => DEFAULT_SETTINGS),
    }),
    [settings, loaded, persist],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}

"use client";

import * as React from "react";

import { SettingsProvider } from "@/lib/hooks/use-settings";
import { WorkbookProvider } from "@/lib/hooks/use-workbook";
import { ExpensesProvider } from "@/lib/hooks/use-expenses";
import { CommandPaletteProvider } from "@/lib/hooks/use-command-palette";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <WorkbookProvider>
        <ExpensesProvider>
          <CommandPaletteProvider>
            {children}
            <Toaster />
          </CommandPaletteProvider>
        </ExpensesProvider>
      </WorkbookProvider>
    </SettingsProvider>
  );
}

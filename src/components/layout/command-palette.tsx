"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ListChecks, Settings, Plus, CalendarRange } from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";

import { useCommandPalette } from "@/lib/hooks/use-command-palette";
import { useSettings } from "@/lib/hooks/use-settings";
import { useCategories } from "@/lib/hooks/use-workbook";
import { weekNumbers } from "@/lib/domain/week";

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { settings } = useSettings();
  const categories = useCategories();
  const [addExpenseOpen, setAddExpenseOpen] = React.useState(false);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Add an expense, jump to a week, filter a category…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Quick actions">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                setAddExpenseOpen(true);
              }}
            >
              <Plus />
              Add expense
              <CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => go("/")}>
              <LayoutDashboard />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => go("/expenses")}>
              <ListChecks />
              Expenses
            </CommandItem>
            <CommandItem onSelect={() => go("/settings")}>
              <Settings />
              Settings
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Jump to a week">
            {weekNumbers(settings.program).map((week) => (
                <CommandItem key={week} onSelect={() => go(`/expenses?week=${week}`)}>
                  <CalendarRange />
                  Week {week}
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Filter by category">
            {categories.list.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(`/expenses?category=${c.id}`)}>
                <CategoryIcon category={c.id} size={15} />
                {c.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <ExpenseFormDialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen} />
    </>
  );
}

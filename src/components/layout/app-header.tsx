"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Receipt, Menu, Search } from "lucide-react";

import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/lib/hooks/use-settings";
import { useCommandPalette } from "@/lib/hooks/use-command-palette";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { setOpen } = useCommandPalette();
  const familyName = settings.family.familyName || "Your Family";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-primary text-primary-foreground">
          <Receipt className="size-4" strokeWidth={2} />
        </span>
        <span className="truncate text-[15px] font-bold">{familyName}</span>
      </Link>

      <nav className="hidden items-center gap-6 sm:flex">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "border-b-2 border-transparent pb-[18px] pt-[18px] text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                active && "border-primary text-primary",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden text-muted-foreground sm:inline-flex"
          onClick={() => setOpen(true)}
        >
          <Search className="size-3.5" />
          Search
          <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]">⌘K</kbd>
        </Button>
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpen(true)}>
          <Search className="size-4" />
        </Button>

        <AddExpenseButton size="sm" className="hidden sm:inline-flex" />
        <AddExpenseButton size="icon" label="" className="sm:hidden" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <Menu className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {NAV_ITEMS.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

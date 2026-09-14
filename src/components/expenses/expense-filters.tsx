"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { CATEGORIES } from "@/lib/domain/categories";
import type { ExpenseFilters } from "@/lib/domain/types";

const NO_FILTERS: ExpenseFilters = {
  search: "",
  category: "all",
  week: "all",
  startDate: null,
  endDate: null,
};

export { NO_FILTERS };

export function ExpenseFiltersBar({
  filters,
  onChange,
  lengthWeeks,
}: {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
  lengthWeeks: number;
}) {
  const hasActiveFilters =
    filters.search !== "" || filters.category !== "all" || filters.week !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1 sm:flex-none sm:basis-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search description…"
          className="pl-8"
        />
      </div>

      <Select
        value={filters.category}
        onValueChange={(value) => onChange({ ...filters, category: value as ExpenseFilters["category"] })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <CategoryIcon category={c.id} size={14} />
                {c.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(filters.week)}
        onValueChange={(value) => onChange({ ...filters, week: value === "all" ? "all" : Number(value) })}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="All weeks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All weeks</SelectItem>
          {Array.from({ length: lengthWeeks }, (_, i) => i + 1).map((w) => (
            <SelectItem key={w} value={String(w)}>
              Week {w}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange(NO_FILTERS)} className="text-muted-foreground">
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}

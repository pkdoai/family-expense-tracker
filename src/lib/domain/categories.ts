import { Banknote, Home, ShoppingBasket, CircleHelp, type LucideIcon } from "lucide-react";

import type { WorkbookCategory } from "@/lib/workbook/types";

export type CategorySectionKind = WorkbookCategory["section"] | "unknown";

export interface CategoryDefinition {
  id: string;
  label: string;
  section: CategorySectionKind;
  icon: LucideIcon;
  /** Tailwind color token name, wired to --color-cat-* in globals.css. */
  colorVar: string;
}

/** The ten palette colours already defined in globals.css; a long category list simply cycles through them. */
const PALETTE = [
  "cat-groceries",
  "cat-transportation",
  "cat-utilities",
  "cat-communications",
  "cat-evictions",
  "cat-daycare",
  "cat-entertainment",
  "cat-shopping",
  "cat-bills",
  "cat-other",
];

const SECTION_ICON: Record<CategorySectionKind, LucideIcon> = {
  income: Banknote,
  fixed: Home,
  variable: ShoppingBasket,
  unknown: CircleHelp,
};

export const SECTION_LABEL: Record<WorkbookCategory["section"], string> = {
  income: "Income received",
  fixed: "Fixed expenses",
  variable: "Variable expenses",
};

/**
 * Categories come from the loaded spending plan, so label/icon/colour
 * lookups go through this index instead of a hard-coded list. An id that
 * isn't in the plan (e.g. from an old backup) still resolves, so nothing
 * on screen can crash on it.
 */
export class CategoryIndex {
  readonly list: CategoryDefinition[];
  private readonly byId: Map<string, CategoryDefinition>;

  constructor(categories: WorkbookCategory[]) {
    this.list = categories.map((c, i) => ({
      id: c.id,
      label: c.label,
      section: c.section,
      icon: SECTION_ICON[c.section],
      colorVar: PALETTE[i % PALETTE.length],
    }));
    this.byId = new Map(this.list.map((c) => [c.id, c]));
  }

  get(id: string): CategoryDefinition {
    return (
      this.byId.get(id) ?? { id, label: id, section: "unknown", icon: SECTION_ICON.unknown, colorVar: "cat-other" }
    );
  }

  isIncome(id: string): boolean {
    return this.get(id).section === "income";
  }

  /** Expense categories only (fixed + variable). */
  get expenseList(): CategoryDefinition[] {
    return this.list.filter((c) => c.section !== "income");
  }
}

export const EMPTY_CATEGORY_INDEX = new CategoryIndex([]);

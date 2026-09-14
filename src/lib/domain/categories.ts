import {
  ShoppingBasket,
  Car,
  Zap,
  Wifi,
  Home,
  Heart,
  Clapperboard,
  ShoppingBag,
  Receipt,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

import type { CategoryId } from "@/lib/domain/types";

export interface CategoryDefinition {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  /** Tailwind color token name, wired to --color-cat-* in globals.css. */
  colorVar: string;
  /** Only "other" currently collects a free-text sub-category + payment method. */
  allowsDetails: boolean;
}

/**
 * The single source of truth for category metadata — label, icon, color,
 * and behavior. Every part of the app (forms, filters, charts, lists)
 * reads from this list rather than switching on category id, so adding
 * or re-theming a category never requires touching consuming code
 * (open/closed principle).
 */
export const CATEGORIES: CategoryDefinition[] = [
  { id: "groceries", label: "Groceries", icon: ShoppingBasket, colorVar: "cat-groceries", allowsDetails: false },
  { id: "transportation", label: "Transportation", icon: Car, colorVar: "cat-transportation", allowsDetails: false },
  { id: "utilities", label: "Utilities", icon: Zap, colorVar: "cat-utilities", allowsDetails: false },
  { id: "communications", label: "Communications", icon: Wifi, colorVar: "cat-communications", allowsDetails: false },
  { id: "evictions", label: "Evictions", icon: Home, colorVar: "cat-evictions", allowsDetails: false },
  { id: "daycare", label: "Daycare", icon: Heart, colorVar: "cat-daycare", allowsDetails: false },
  { id: "entertainment", label: "Entertainment", icon: Clapperboard, colorVar: "cat-entertainment", allowsDetails: false },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, colorVar: "cat-shopping", allowsDetails: false },
  { id: "bills", label: "Bills", icon: Receipt, colorVar: "cat-bills", allowsDetails: false },
  { id: "other", label: "Other", icon: MoreHorizontal, colorVar: "cat-other", allowsDetails: true },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): CategoryDefinition {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown category id: ${id}`);
  return found;
}

export function categoryAllowsDetails(id: CategoryId): boolean {
  return getCategory(id).allowsDetails;
}

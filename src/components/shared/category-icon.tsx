"use client";

import { useCategories } from "@/lib/hooks/use-workbook";
import { cn } from "@/lib/utils";

/**
 * Category colors are applied via inline `style`, not a Tailwind class built
 * from a variable — Tailwind's build-time scanner can't see a class name
 * assembled at runtime (`text-${colorVar}`), so that pattern would silently
 * produce no styling at all once the app is built for production.
 */
export function useCategoryColor(): (id: string) => string {
  const categories = useCategories();
  return (id) => `var(--${categories.get(id).colorVar})`;
}

export function CategoryIcon({ category, className, size = 16 }: { category: string; className?: string; size?: number }) {
  const categories = useCategories();
  const def = categories.get(category);
  const Icon = def.icon;
  return <Icon size={size} className={cn(className)} style={{ color: `var(--${def.colorVar})` }} strokeWidth={1.75} />;
}

export function CategoryDot({ category, className }: { category: string; className?: string }) {
  const categories = useCategories();
  return (
    <span
      className={cn("inline-block size-2 rounded-[2px]", className)}
      style={{ backgroundColor: `var(--${categories.get(category).colorVar})` }}
    />
  );
}

export function CategoryLabel({ category }: { category: string }) {
  const categories = useCategories();
  return <span>{categories.get(category).label}</span>;
}

import { getCategory } from "@/lib/domain/categories";
import type { CategoryId } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * Category colors are applied via inline `style`, not a Tailwind class built
 * from a variable — Tailwind's build-time scanner can't see a class name
 * assembled at runtime (`text-${colorVar}`), so that pattern would silently
 * produce no styling at all once the app is built for production.
 */
export function categoryColorVar(category: CategoryId): string {
  return `var(--${getCategory(category).colorVar})`;
}

export function CategoryIcon({
  category,
  className,
  size = 16,
}: {
  category: CategoryId;
  className?: string;
  size?: number;
}) {
  const Icon = getCategory(category).icon;
  return (
    <Icon
      size={size}
      className={cn(className)}
      style={{ color: categoryColorVar(category) }}
      strokeWidth={1.75}
    />
  );
}

export function CategoryDot({ category, className }: { category: CategoryId; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 rounded-[2px]", className)}
      style={{ backgroundColor: categoryColorVar(category) }}
    />
  );
}

export function CategoryLabel({ category }: { category: CategoryId }) {
  return <span>{getCategory(category).label}</span>;
}

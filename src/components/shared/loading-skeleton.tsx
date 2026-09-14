import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function StatTileSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

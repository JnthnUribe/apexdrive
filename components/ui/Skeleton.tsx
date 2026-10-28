import { cn } from "@/lib/cn";

/** Placeholder de carga (skeleton). Usar en loading.tsx y Suspense. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-ink/10", className ?? "h-40 w-full")} />
  );
}

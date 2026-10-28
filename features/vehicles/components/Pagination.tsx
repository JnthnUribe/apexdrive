import Link from "next/link";
import { cn } from "@/lib/cn";

/** Paginación numerada (Server): URLs compartibles (?page=N), bueno para SEO. */
export function Pagination({
  page,
  pageCount,
  baseParams,
}: {
  page: number;
  pageCount: number;
  baseParams: string;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number): string => (p <= 1 ? `/cars${baseParams}` : `/cars${baseParams}${baseParams ? "&" : "?"}page=${p}`);
  const window: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pageCount, page + 2); p++) window.push(p);
  return (
    <nav aria-label="Paginación" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5">
          ← Anterior
        </Link>
      ) : null}
      {window.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium",
            p === page ? "bg-ink text-white" : "border border-line hover:bg-ink/5",
          )}
        >
          {p}
        </Link>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5">
          Siguiente →
        </Link>
      ) : null}
    </nav>
  );
}

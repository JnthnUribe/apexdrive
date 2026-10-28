import type { ReactNode } from "react";

/** Estado vacío con acción. Ninguna pantalla muestra vacío sin salida. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-slate-50 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl text-brand" aria-hidden="true">⌕</span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

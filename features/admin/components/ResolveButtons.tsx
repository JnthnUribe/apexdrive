"use client";
// Cliente por useActionState. Solo reportes OPEN muestran acciones.

import { useActionState } from "react";
import { resolveReportAction, type AdminActionResult } from "@/features/admin/actions";
import { cn } from "@/lib/cn";

const INITIAL: AdminActionResult = { ok: false, message: "" };

const btn = "rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50";

export function ResolveButtons({ id }: { id: string }) {
  const [state, submit, pending] = useActionState(resolveReportAction, INITIAL);
  return (
    <div className="flex flex-col gap-1">
      <form action={submit} className="flex gap-2">
        <input type="hidden" name="id" value={id} />
        <button name="status" value="RESOLVED" disabled={pending} className={cn(btn, "bg-green-700 text-white hover:bg-green-800")}>
          Resolver
        </button>
        <button name="status" value="DISMISSED" disabled={pending} className={cn(btn, "border border-line hover:bg-ink/5")}>
          Descartar
        </button>
      </form>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-green-700" : "text-xs text-red-700"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

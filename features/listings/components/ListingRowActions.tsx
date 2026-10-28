"use client";
// Cliente por useActionState: una sola acción `manage` con op en el botón
// presionado (sold|archive|withdraw). Solo renderiza lo permitido por estado.

import { useActionState } from "react";
import { manageAction, type ListingActionResult } from "@/features/listings/actions";
import type { ListingStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

const INITIAL: ListingActionResult = { ok: false, message: "" };

const btn = "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50";

export function ListingRowActions({ id, status }: { id: string; status: ListingStatus }) {
  const [state, submit, pending] = useActionState(manageAction, INITIAL);
  return (
    <div className="flex flex-col gap-1">
      <form action={submit} className="flex flex-wrap gap-2">
        <input type="hidden" name="draftId" value={id} />
        {(status === "DRAFT" || status === "REJECTED" || status === "PENDING") && (
          <button name="op" value="archive" disabled={pending} className={cn(btn, "border-line hover:bg-ink/5")}>
            Archivar
          </button>
        )}
        {status === "PENDING" && (
          <button name="op" value="withdraw" disabled={pending} className={cn(btn, "border-line hover:bg-ink/5")}>
            Retirar a borrador
          </button>
        )}
        {status === "PUBLISHED" && (
          <button name="op" value="sold" disabled={pending} className={cn(btn, "border-green-700 text-green-800 hover:bg-green-50")}>
            Marcar vendida
          </button>
        )}
        {status === "PUBLISHED" && (
          <button name="op" value="archive" disabled={pending} className={cn(btn, "border-line hover:bg-ink/5")}>
            Archivar
          </button>
        )}
        {status === "SOLD" && (
          <button name="op" value="archive" disabled={pending} className={cn(btn, "border-line hover:bg-ink/5")}>
            Archivar
          </button>
        )}
      </form>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-green-700" : "text-xs text-red-700"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

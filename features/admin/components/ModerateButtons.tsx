"use client";
// Cliente por useActionState. Un solo formulario: el botón presionado define
// la decisión (approve|reject|hide); reject exige motivo.

import { useActionState } from "react";
import { moderateAction, type AdminActionResult } from "@/features/admin/actions";
import { cn } from "@/lib/cn";

const INITIAL: AdminActionResult = { ok: false, message: "" };

const btn = "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50";

export function ModerateButtons({ id }: { id: string }) {
  const [state, submit, pending] = useActionState(moderateAction, INITIAL);
  return (
    <div className="flex flex-col gap-1">
      <form action={submit} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input
          name="reason"
          maxLength={500}
          placeholder="Motivo (obligatorio para rechazar)"
          className="min-w-40 flex-1 rounded-full border border-line px-3 py-1.5 text-xs outline-none focus:border-ink"
        />
        <button name="decision" value="approve" disabled={pending} className={cn(btn, "bg-green-700 text-white hover:bg-green-800")}>
          Aprobar
        </button>
        <button name="decision" value="reject" disabled={pending} className={cn(btn, "bg-red-700 text-white hover:bg-red-800")}>
          Rechazar
        </button>
        <button name="decision" value="hide" disabled={pending} className={cn(btn, "border border-line hover:bg-ink/5")}>
          Ocultar
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

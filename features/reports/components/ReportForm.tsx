"use client";
// Cliente por useActionState. Requiere sesión (la acción responde 401 honesto
// con enlace a login si no la hay).

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createReportAction, type ReportActionResult } from "@/features/reports/actions";
import { cn } from "@/lib/cn";

const INITIAL: ReportActionResult = { ok: false, message: "" };

export function ReportForm({ listingId, slug }: { listingId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState(createReportAction, INITIAL);
  return (
    <div className="rounded-2xl border border-line p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
      >
        {open ? "Cerrar reporte" : "Reportar esta publicación"}
      </button>
      <form action={submit} className={cn("mt-3 flex-col gap-3", open ? "flex" : "hidden")}>
        <input type="hidden" name="listingId" value={listingId} />
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={cn("rounded-xl px-4 py-3 text-sm", state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")}>
            {state.message}{" "}
            {!state.ok && state.message.includes("sesión") ? (
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/cars/${slug}`)}`} className="font-semibold underline">
                Iniciar sesión
              </Link>
            ) : null}
          </p>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Motivo
          <select name="reason" required defaultValue="WRONG_INFO" className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-ink">
            <option value="WRONG_INFO">Información incorrecta</option>
            <option value="SPAM">Spam</option>
            <option value="FRAUD">Posible fraude</option>
            <option value="DUPLICATE">Duplicada</option>
            <option value="OTHER">Otro</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Detalle (opcional, máx 500)
          <textarea name="detail" rows={3} maxLength={500} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-ink" />
        </label>
        <div>
          <Button type="submit" disabled={pending} variant="ghost">
            {pending ? "Enviando…" : "Enviar reporte"}
          </Button>
        </div>
      </form>
    </div>
  );
}

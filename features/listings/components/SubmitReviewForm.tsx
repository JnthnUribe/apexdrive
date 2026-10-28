"use client";
// Cliente por useActionState. Solo se renderiza cuando el borrador está listo
// para revisión (el servidor decide); aquí solo pending + resultado.

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { submitAction, type ListingActionResult } from "@/features/listings/actions";

const INITIAL: ListingActionResult = { ok: false, message: "" };

export function SubmitReviewForm({ draftId }: { draftId: string }) {
  const [state, submit, pending] = useActionState(submitAction, INITIAL);
  return (
    <form action={submit} className="mt-6 flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="draftId" value={draftId} />
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"}>
          {state.message}{" "}
          {state.ok ? (
            <Link href="/dashboard/listings" className="font-semibold underline underline-offset-2">
              Ver mis publicaciones
            </Link>
          ) : null}
        </p>
      ) : null}
      {!state.ok ? (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Enviar a revisión"}
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted">
        Al enviar aceptas que el equipo de ApexDrive revise la publicación antes de hacerla visible.
      </p>
    </form>
  );
}

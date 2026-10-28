"use client";
// Cliente por useActionState (pending + mensaje inline del servidor).
// Los campos los renderiza la página del paso (Server); aquí solo el shell.

import type { ReactNode } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { updateStepAction, type ListingActionResult } from "@/features/listings/actions";

const INITIAL: ListingActionResult = { ok: false, message: "" };

export function DraftStepForm({
  draftId,
  step,
  children,
  submitLabel = "Guardar y continuar",
}: {
  draftId: string;
  step: number;
  children: ReactNode;
  submitLabel?: string;
}) {
  const [state, submit, pending] = useActionState(updateStepAction, INITIAL);
  return (
    <form action={submit} className="mt-6 flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="draftId" value={draftId} />
      <input type="hidden" name="step" value={step} />
      {children}
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"}>
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

"use client";
// Cliente por useActionState (pending + mensaje inline).

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveComparisonAction, type ComparisonActionResult } from "@/features/compare/actions";

const INITIAL: ComparisonActionResult = { ok: false, message: "" };

export function SaveComparisonForm({ slugs }: { slugs: string[] }) {
  const [state, submit, pending] = useActionState(saveComparisonAction, INITIAL);
  return (
    <form action={submit} className="mt-6 flex max-w-md flex-col gap-3 rounded-2xl border border-line p-5">
      <input type="hidden" name="slugs" value={slugs.join(",")} />
      <h2 className="font-bold">Guardar en mi cuenta</h2>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"}>
          {state.message}
        </p>
      ) : null}
      <Input label="Nombre" name="name" required maxLength={60} placeholder="Ej. SUV familiares" />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar comparativa"}
        </Button>
      </div>
    </form>
  );
}

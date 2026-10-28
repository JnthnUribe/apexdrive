"use client";
// Cliente por useActionState. Las URLs se validan en servidor (https + extensión);
// el navegador las previsualiza al guardar (prueba visual de que cargan).

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { addPhotoAction, type ListingActionResult } from "@/features/listings/actions";

const INITIAL: ListingActionResult = { ok: false, message: "" };

export function AddPhotoForm({ draftId, count }: { draftId: string; count: number }) {
  const [state, submit, pending] = useActionState(addPhotoAction, INITIAL);
  return (
    <form action={submit} className="flex max-w-2xl flex-col gap-3">
      <input type="hidden" name="draftId" value={draftId} />
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"}>
          {state.message}
        </p>
      ) : null}
      <Input
        label={`URL de fotografía https (${count}/12)`}
        name="url"
        type="url"
        required
        maxLength={500}
        placeholder="https://…/foto.jpg"
        hint="JPG, JPEG, PNG o WebP. En Fase 8 llega la subida directa; hoy se aceptan URLs."
      />
      <div>
        <Button type="submit" disabled={pending || count >= 12}>
          {pending ? "Agregando…" : "Agregar foto"}
        </Button>
      </div>
    </form>
  );
}

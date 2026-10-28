"use client";
// Cliente por useActionState. Valores iniciales desde el perfil real del servidor.

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateProfileAction, type ActionResult } from "@/features/auth/actions";

const INITIAL: ActionResult = { ok: false, message: "" };

export function ProfileForm({
  profile,
}: {
  profile: { displayName: string; phone: string | null; city: string | null };
}) {
  const [state, submit, pending] = useActionState(updateProfileAction, INITIAL);
  return (
    <form action={submit} className="flex flex-col gap-4">
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            state.ok
              ? "rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800"
              : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
          }
        >
          {state.message}
        </p>
      ) : null}
      <Input label="Nombre para mostrar" name="displayName" defaultValue={profile.displayName} required maxLength={60} />
      <Input label="Teléfono" name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} maxLength={20} />
      <Input label="Ciudad" name="city" autoComplete="address-level2" defaultValue={profile.city ?? ""} maxLength={80} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

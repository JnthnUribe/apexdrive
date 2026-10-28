"use client";
// Cliente por useActionState. El token viaja en campo oculto (viene de la URL
// válida); sin token esta pantalla ni siquiera se renderiza (ver page.tsx).

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { resetAction, type ActionResult } from "@/features/auth/actions";

const INITIAL: ActionResult = { ok: false, message: "" };

export function ResetForm({ token }: { token: string }) {
  const [state, submit, pending] = useActionState(resetAction, INITIAL);
  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            state.ok
              ? "rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800"
              : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
          }
        >
          {state.message}{" "}
          {state.ok ? (
            <Link href="/login" className="font-semibold underline underline-offset-2">
              Iniciar sesión
            </Link>
          ) : null}
        </p>
      ) : null}
      <Input
        label="Nueva contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={72}
        hint="Mínimo 12 caracteres, con letras y números. Invalida tus otras sesiones."
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Actualizando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

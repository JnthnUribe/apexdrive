"use client";
// Cliente por useActionState. El enlace de desarrollo (devPreview) solo existe
// fuera de producción y se muestra como ayuda local, nunca por correo real.

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { forgotAction, type ActionResult } from "@/features/auth/actions";

const INITIAL: ActionResult = { ok: false, message: "" };

export function ForgotForm() {
  const [state, submit, pending] = useActionState(forgotAction, INITIAL);
  return (
    <form action={submit} className="flex flex-col gap-4">
      {state.message ? (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          {state.message}
        </p>
      ) : null}
      {state.devPreview ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Modo desarrollo (sin SMTP):{" "}
          <Link href={state.devPreview} className="font-semibold underline underline-offset-2">
            abrir enlace de recuperación
          </Link>
        </p>
      ) : null}
      <Input label="Correo de tu cuenta" name="email" type="email" autoComplete="email" required maxLength={160} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar instrucciones"}
      </Button>
    </form>
  );
}

"use client";
// Cliente por useActionState (pending + resultado inline sin JS manual).

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { registerAction, type ActionResult } from "@/features/auth/actions";

const INITIAL: ActionResult = { ok: false, message: "" };

export function RegisterForm() {
  const [state, submit, pending] = useActionState(registerAction, INITIAL);
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
          {state.message}{" "}
          {state.ok ? (
            <Link href="/login" className="font-semibold underline underline-offset-2">
              Ir al inicio de sesión
            </Link>
          ) : null}
        </p>
      ) : null}
      <Input label="Nombre para mostrar" name="displayName" autoComplete="name" required maxLength={60} />
      <Input label="Correo" name="email" type="email" autoComplete="email" required maxLength={160} />
      <Input
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={72}
        hint="Mínimo 12 caracteres, con letras y números."
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}

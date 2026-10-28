"use client";
// Cliente porque el sign-in de credenciales de Auth.js ocurre en el navegador
// (usa useState para pending y useSearchParams para callbackUrl/errores de URL).

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const ERROR_TEXT: Record<string, string> = {
  CredentialsSignin: "Credenciales inválidas. Verifica correo y contraseña.",
  OAuthAccountNotLinked: "Ese correo ya tiene cuenta con otro método de acceso.",
};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState("");
  const urlError = params.get("error");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setPending(true);
    setLocalError("");
    const data = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      redirect: false,
    });
    if (res?.error) {
      setLocalError(ERROR_TEXT[res.error] ?? "No se pudo iniciar sesión. Inténtalo de nuevo.");
      setPending(false);
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
      {urlError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {ERROR_TEXT[urlError] ?? "No se pudo iniciar sesión."}
        </p>
      ) : null}
      {localError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {localError}
        </p>
      ) : null}
      <Input label="Correo" name="email" type="email" autoComplete="email" required maxLength={160} />
      <Input
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={72}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Verificando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}

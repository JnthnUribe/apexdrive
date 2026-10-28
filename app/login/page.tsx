import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { googleEnabled } from "@/lib/auth";
import { AuthShell } from "@/components/layout/AuthShell";

export const metadata: Metadata = { title: "Iniciar sesión" };

function safeCallbackUrl(raw: string | undefined): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
    registered?: string;
    reset?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <Container className="max-w-md py-14">
        <h1 className="text-3xl font-bold tracking-tight">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted">Accede a tu cuenta de ApexDrive.</p>
        {params.registered ? (
          <p role="status" className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            Revisa el mensaje de confirmación y continúa aquí.
          </p>
        ) : null}
        {params.reset ? (
          <p role="status" className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            Contraseña actualizada. Inicia sesión con tu nueva contraseña.
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-5">
          <GoogleButton enabled={googleEnabled} />
          <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /> o con correo{" "}
            <span className="h-px flex-1 bg-line" />
          </div>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <LoginForm callbackUrl={safeCallbackUrl(params.callbackUrl)} />
          </Suspense>
          <p className="text-center text-sm text-muted">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-semibold text-ink underline underline-offset-2">
              Crear cuenta
            </Link>{" "}
            ·{" "}
            <Link
              href="/forgot-password"
              className="font-semibold text-ink underline underline-offset-2"
            >
              Olvidé mi contraseña
            </Link>
          </p>
        </div>
      </Container>
    </AuthShell>
  );
}

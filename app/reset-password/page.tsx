import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResetForm } from "@/features/auth/components/ResetForm";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  // Sin token no hay formulario: el enlace siempre llega por correo.
  if (!token) {
    return (
      <Container className="max-w-md py-14">
        <EmptyState
          title="Enlace incompleto"
          description="Falta el token de recuperación. Solicita un nuevo enlace desde la página de recuperación."
          action={
            <Link
              href="/forgot-password"
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black"
            >
              Solicitar enlace
            </Link>
          }
        />
      </Container>
    );
  }
  return (
    <Container className="max-w-md py-14">
      <h1 className="text-3xl font-bold tracking-tight">Nueva contraseña</h1>
      <p className="mt-1 text-sm text-muted">El enlace es de un solo uso y expira en 1 hora.</p>
      <div className="mt-6">
        <ResetForm token={token} />
      </div>
    </Container>
  );
}

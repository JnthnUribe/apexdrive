import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { AuthShell } from "@/components/layout/AuthShell";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <AuthShell>
      <Container className="max-w-md py-14">
        <h1 className="text-3xl font-bold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Guarda los autos que te gustan y reúne tus comparativas. Tu cuenta comienza como
          comprador.
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
            Iniciar sesión
          </Link>
        </p>
      </Container>
    </AuthShell>
  );
}

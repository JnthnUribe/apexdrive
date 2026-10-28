import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ForgotForm } from "@/features/auth/components/ForgotForm";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <Container className="max-w-md py-14">
      <h1 className="text-3xl font-bold tracking-tight">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-muted">
        Te enviamos instrucciones si existe una cuenta con ese correo.
      </p>
      <div className="mt-6">
        <ForgotForm />
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
          Volver al inicio de sesión
        </Link>
      </p>
    </Container>
  );
}

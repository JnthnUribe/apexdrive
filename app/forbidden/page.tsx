import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Acceso denegado" };

export default function ForbiddenPage() {
  return (
    <Container className="max-w-md py-14">
      <EmptyState
        title="Acceso denegado (403)"
        description="Tu cuenta no tiene permiso para esta sección. Si crees que es un error, contacta soporte."
        action={
          <Link
            href="/dashboard"
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            Ir a mi cuenta
          </Link>
        }
      />
    </Container>
  );
}

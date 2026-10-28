import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ErrorState } from "@/components/ui/ErrorState";
import { getAdminMetrics } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Administración" };

/** Siempre dinámica: depende de sesión ADMIN (sin prerender estático). */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let m;
  try {
    m = await getAdminMetrics();
  } catch {
    return (
      <Container className="max-w-5xl py-12">
        <ErrorState title="Administración no disponible" message="La base de datos no está disponible." retryHref="/admin" />
      </Container>
    );
  }
  const cards: Array<{ label: string; value: number | string; href: string }> = [
    { label: "Usuarios", value: m.users, href: "/admin/users" },
    { label: "Vendedores", value: m.sellers, href: "/admin/users" },
    { label: "Pendientes de revisión", value: m.listingsByStatus["PENDING"] ?? 0, href: "/admin/listings" },
    { label: "Publicados", value: m.listingsByStatus["PUBLISHED"] ?? 0, href: "/admin/listings?status=PUBLISHED" },
    { label: "Reportes abiertos", value: m.openReports, href: "/admin/reports" },
    { label: "Comparativas", value: m.comparisons, href: "/admin/actions" },
  ];
  return (
    <Container className="max-w-5xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label + c.href} href={c.href} className="rounded-2xl border border-line p-6 transition-shadow hover:shadow-md">
            <p className="text-3xl font-extrabold">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label} →</p>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm">
        <Link href="/admin/actions" className="font-semibold underline underline-offset-4">
          Ver auditoría de acciones →
        </Link>
      </p>
    </Container>
  );
}

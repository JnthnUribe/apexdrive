import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ResolveButtons } from "@/features/admin/components/ResolveButtons";
import { getAdminReports } from "@/features/admin/queries";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Reportes" };

/** Siempre dinámica: depende de sesión ADMIN (sin prerender estático). */
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  let reports;
  try {
    reports = await getAdminReports();
  } catch {
    return (
      <Container className="max-w-5xl py-12">
        <ErrorState title="Reportes no disponibles" message="La base de datos no está disponible." retryHref="/admin/reports" />
      </Container>
    );
  }
  const open = reports.filter((r) => r.status === "OPEN");
  return (
    <Container className="max-w-5xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">Reportes ({open.length} abiertos)</h1>
      {reports.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Sin reportes" description="Nadie ha reportado contenido todavía." />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <span className={cn("mr-2 rounded-full px-2 py-0.5 text-xs font-semibold", r.status === "OPEN" ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-500")}>
                    {r.status}
                  </span>
                  <b>{r.reason}</b> ·{" "}
                  <Link href={`/cars/${r.listingSlug}`} className="font-medium hover:underline">
                    {r.listingTitle}
                  </Link>
                </p>
                {r.status === "OPEN" ? <ResolveButtons id={r.id} /> : null}
              </div>
              <p className="mt-1 text-xs text-muted">
                {r.detail ?? "Sin detalle."} · reportó {r.reporterEmail ?? "?"} ·{" "}
                {r.createdAt.toLocaleDateString("es-MX")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

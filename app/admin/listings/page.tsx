import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ModerateButtons } from "@/features/admin/components/ModerateButtons";
import { getPendingListings } from "@/features/admin/queries";
import { formatMXN } from "@/lib/format";

export const metadata: Metadata = { title: "Moderación" };

/** Siempre dinámica: depende de sesión ADMIN (sin prerender estático). */
export const dynamic = "force-dynamic";

/** Cola de revisión (?status=PENDING por defecto). Aprobar publica con fecha. */
export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const onlyPending = (params.status ?? "PENDING") !== "ALL";
  let rows: Awaited<ReturnType<typeof getPendingListings>> = [];
  try {
    rows = onlyPending ? await getPendingListings() : [];
  } catch {
    return (
      <Container className="max-w-5xl py-12">
        <ErrorState title="Moderación no disponible" message="La base de datos no está disponible." retryHref="/admin/listings" />
      </Container>
    );
  }
  return (
    <Container className="max-w-5xl py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {onlyPending ? "Pendientes de revisión" : "Moderación"}
        </h1>
        <Link href={onlyPending ? "/admin/listings?status=ALL" : "/admin/listings"} className="text-sm font-semibold underline underline-offset-4">
          {onlyPending ? "Ver guía de estados" : "Ver pendientes"}
        </Link>
      </div>
      {!onlyPending ? (
        <p className="mt-4 max-w-2xl rounded-2xl border border-line p-5 text-sm text-muted">
          La moderación opera sobre la cola PENDING (aprobar → PUBLISHED, rechazar →
          REJECTED) y sobre publicados visibles (ocultar → ARCHIVED). Toda decisión
          queda en auditoría.
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Cola vacía" description="No hay publicaciones pendientes de revisión." />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{r.title}</p>
                <p className="font-extrabold">{r.priceMXN !== null ? formatMXN(r.priceMXN) : "sin precio"}</p>
              </div>
              <p className="mt-1 text-xs text-muted">
                {r.brand.name} · {r.carModel.name} · {r.year} · {r.city ?? "—"} · {r.photoCount} fotos ·
                vendedor {r.sellerEmail ?? "?"} · enviada {r.createdAt.toLocaleDateString("es-MX")}
              </p>
              <div className="mt-3">
                <ModerateButtons id={r.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

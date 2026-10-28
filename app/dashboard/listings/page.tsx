import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/authz";
import { formatMXN } from "@/lib/format";
import { getMyListings } from "@/features/listings/queries";
import { ListingRowActions } from "@/features/listings/components/ListingRowActions";
import type { ListingStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Mis publicaciones" };

const BADGES: Record<ListingStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  PENDING: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SOLD: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-neutral-100 text-neutral-500",
};

export default async function MyListingsPage() {
  const user = await requireFreshUser();
  const listings = await getMyListings(user.id);

  return (
    <Container className="max-w-5xl py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis publicaciones</h1>
          <p className="mt-1 text-sm text-muted">Solo ves y modificas tus propias publicaciones.</p>
        </div>
        <Link href="/sell/new" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
          + Nueva
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aún no tienes publicaciones"
            description="Crea tu primera publicación con el wizard de 8 pasos. Nota: publicar requiere cuenta de vendedor."
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {listings.map((l) => (
            <li key={l.id} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">
                    {l.status === "PUBLISHED" ? (
                      <Link href={`/cars/${l.slug}`} className="hover:underline">
                        {l.title}
                      </Link>
                    ) : (
                      l.title
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className={cn("rounded-full px-2 py-0.5 font-semibold", BADGES[l.status])}>
                      {l.status}
                    </span>
                    <span>{l.priceMXN ? formatMXN(l.priceMXN) : "sin precio"}</span>
                    <span>· act. {l.updatedAt.toLocaleDateString("es-MX")}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(l.status === "DRAFT" || l.status === "REJECTED") && (
                    <Link href={`/sell/${l.id}/step/1`} className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold hover:bg-ink/5">
                      Continuar editando
                    </Link>
                  )}
                  {l.status === "PUBLISHED" && (
                    <Link href={`/sell/${l.id}/step/6`} className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold hover:bg-ink/5">
                      Cambiar precio
                    </Link>
                  )}
                  <ListingRowActions id={l.id} status={l.status} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

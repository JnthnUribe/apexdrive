import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/authz";
import { sellerOf } from "@/features/listings/drafts";
import { getMyListings } from "@/features/listings/queries";

export const metadata: Metadata = { title: "Vender" };

/** Hub de venta (SELLER+ por proxy). Crea la fila Seller si falta y reanuda borradores. */
export default async function SellPage() {
  let user;
  try {
    user = await requireFreshUser();
  } catch {
    redirect("/login?callbackUrl=%2Fsell");
  }
  await sellerOf({ userId: user.id, role: user.role });
  const listings = await getMyListings(user.id);
  const drafts = listings.filter((l) => l.status === "DRAFT" || l.status === "REJECTED" || l.status === "PENDING");

  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-4xl font-bold tracking-tight">Vende tu auto</h1>
      <p className="mt-2 text-sm text-muted">
        Publicación guiada en 8 pasos con borrador automático. Nada se hace visible sin revisión.
      </p>
      <div className="mt-6">
        <Link href="/sell/new" className="inline-block rounded-full bg-ink px-7 py-3 text-sm font-semibold text-white hover:bg-black">
          + Nueva publicación
        </Link>
      </div>
      <h2 className="mt-10 text-xl font-bold">Borradores y envíos</h2>
      {drafts.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Sin borradores"
            description="Crea tu primera publicación y retómala cuando quieras: cada paso se guarda."
          />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {drafts.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line p-4">
              <div>
                <p className="font-semibold">{d.title}</p>
                <p className="text-xs text-muted">{d.status} · {d.photoCount} fotos</p>
              </div>
              <Link href={`/sell/${d.id}/step/1`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-ink/5">
                Continuar
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm">
        <Link href="/dashboard/listings" className="font-semibold underline underline-offset-4">
          Ver todas mis publicaciones →
        </Link>
      </p>
    </Container>
  );
}

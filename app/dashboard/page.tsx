import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { RemoveFavoriteButton } from "@/features/favorites/components/RemoveFavoriteButton";
import { getMyFavorites } from "@/features/favorites/queries";
import { DeleteComparisonButton } from "@/features/compare/components/DeleteComparisonButton";
import { listMyComparisons } from "@/features/compare/actions";
import { compareUrl } from "@/features/compare/selection";
import { requireFreshUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatMXN } from "@/lib/format";

export const metadata: Metadata = { title: "Mi cuenta" };

/** Mi cuenta: perfil + favoritos + comparativas guardadas. */
export default async function DashboardPage() {
  const user = await requireFreshUser();
  const [row, favorites, comparisons] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        role: true,
        createdAt: true,
        profile: { select: { displayName: true, phone: true, city: true } },
      },
    }),
    getMyFavorites(user.id),
    listMyComparisons(user.id),
  ]);
  if (!row || !row.profile) {
    throw new Error("Perfil no encontrado para la sesión activa.");
  }

  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">Mi cuenta</h1>
      <section aria-label="Datos de cuenta" className="mt-6 rounded-2xl border border-line p-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold tracking-widest text-muted">CORREO</dt>
            <dd className="mt-1 font-medium">{row.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-widest text-muted">ROL</dt>
            <dd className="mt-1 font-medium">{row.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-widest text-muted">MIEMBRO DESDE</dt>
            <dd className="mt-1 font-medium">{row.createdAt.toLocaleDateString("es-MX")}</dd>
          </div>
        </dl>
      </section>
      <section aria-label="Perfil" className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-lg font-bold">Perfil</h2>
        <div className="mt-4">
          <ProfileForm profile={row.profile} />
        </div>
      </section>
      <section aria-label="Favoritos" className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-lg font-bold">Favoritos ({favorites.length})</h2>
        {favorites.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Aún no guardas favoritos. Explora el{" "}
            <Link href="/cars" className="font-semibold underline underline-offset-2">
              catálogo
            </Link>{" "}
            y guarda con ♡.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {favorites.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-sm">
                <Link href={`/cars/${f.slug}`} className="font-medium hover:underline">
                  {f.title} · {f.priceMXN !== null ? formatMXN(f.priceMXN) : "—"}
                </Link>
                <RemoveFavoriteButton listingId={f.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Comparativas guardadas" className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-lg font-bold">Comparativas guardadas ({comparisons.length})</h2>
        {comparisons.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Guarda comparativas desde la página de{" "}
            <Link href="/compare" className="font-semibold underline underline-offset-2">
              comparar
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {comparisons.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-sm">
                <Link href={compareUrl(c.items.map((i) => i.listing.slug))} className="font-medium hover:underline">
                  {c.name} ({c.items.length})
                </Link>
                <DeleteComparisonButton id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </Container>
  );
}

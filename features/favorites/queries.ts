import { db } from "@/lib/db";
import { cardSelect, type CatalogCard } from "@/features/vehicles/queries";

// Favoritos del usuario (solo publicados, más recientes primero).
// Proyección card: reutiliza el select del catálogo, sin N+1.

export async function getMyFavorites(userId: string): Promise<CatalogCard[]> {
  const rows = await db.favorite.findMany({
    where: { userId, listing: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    select: { listing: { select: cardSelect } },
  });
  return rows.map((r) => r.listing);
}

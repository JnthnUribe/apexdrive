import { db } from "@/lib/db";

// Lecturas del vendedor sobre SUS publicaciones (ownership por seller.userId).

export type MyListingRow = {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "SOLD" | "REJECTED" | "ARCHIVED";
  priceMXN: number | null;
  updatedAt: Date;
  photoCount: number;
};

export async function getMyListings(userId: string): Promise<MyListingRow[]> {
  const seller = await db.seller.findUnique({ where: { userId }, select: { id: true } });
  if (!seller) return [];
  const rows = await db.listing.findMany({
    where: { sellerId: seller.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      priceMXN: true,
      updatedAt: true,
      _count: { select: { images: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    priceMXN: r.priceMXN,
    updatedAt: r.updatedAt,
    photoCount: r._count.images,
  }));
}

export async function getBrandsWithModels(): Promise<
  Array<{ slug: string; name: string; models: Array<{ slug: string; name: string }> }>
> {
  return db.brand.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      models: { orderBy: { name: "asc" }, select: { slug: true, name: true } },
    },
  });
}

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Sitemap: rutas estáticas + listings publicados (límite 1000, los recientes).
// Sin DB solo emite estáticas (modo degradado honesto).

const STATIC_ROUTES = [
  "/",
  "/cars",
  "/compare",
  "/como-funciona",
  "/login",
  "/register",
  "/forgot-password",
];

/** Revalidación horaria: el sitemap no necesita golpe de DB por request. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }));
  try {
    if (!process.env["DATABASE_URL"]) return staticEntries;
    const rows = await db.listing.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }],
      select: { slug: true, updatedAt: true },
      take: 1000,
    });
    return [
      ...staticEntries,
      ...rows.map((r) => ({
        url: `${base}/cars/${r.slug}`,
        lastModified: r.updatedAt,
      })),
    ];
  } catch {
    return staticEntries;
  }
}

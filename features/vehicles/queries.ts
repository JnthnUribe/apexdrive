import { cache } from "react";
import type { BodyType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { rankRelated } from "./related";
import {
  PAGE_SIZE,
  buildOrderBy,
  buildVehicleWhere,
  pageCount,
  type CatalogQuery,
} from "./catalogFilters";

// Lecturas del catálogo. Una sola query por función (include = JOIN, nunca N+1).
// Proyecciones explícitas: jamás SELECT *. Sin DATABASE_URL → 503 honesto.

function needDb(): void {
  if (!process.env["DATABASE_URL"]) {
    throw new AppError("UNAVAILABLE", "No podemos consultar las publicaciones en este momento. Inténtalo de nuevo más tarde.");
  }
}

export const cardSelect = {
  id: true,
  slug: true,
  title: true,
  year: true,
  priceMXN: true,
  mileageKm: true,
  fuel: true,
  transmission: true,
  bodyType: true,
  condition: true,
  city: true,
  publishedAt: true,
  brand: { select: { name: true, slug: true } },
  carModel: { select: { name: true, slug: true } },
  images: { select: { r2Key: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.ListingSelect;

export type CatalogCard = Prisma.ListingGetPayload<{ select: typeof cardSelect }>;

export type CatalogPage = {
  items: CatalogCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function getCatalogPage(query: CatalogQuery): Promise<CatalogPage> {
  needDb();
  const where = buildVehicleWhere(query);
  const orderBy = buildOrderBy(query.sort);
  const [items, total] = await db.$transaction([
    db.listing.findMany({
      where,
      orderBy,
      select: cardSelect,
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.listing.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: PAGE_SIZE, pageCount: pageCount(total) };
}

const detailSelect = {
  id: true,
  slug: true,
  title: true,
  version: true,
  year: true,
  priceMXN: true,
  brandId: true,
  mileageKm: true,
  fuel: true,
  transmission: true,
  bodyType: true,
  condition: true,
  engine: true,
  powerHp: true,
  torqueNm: true,
  exteriorColor: true,
  interiorColor: true,
  city: true,
  description: true,
  features: true,
  publishedAt: true,
  viewCount: true,
  brand: { select: { name: true, slug: true } },
  carModel: { select: { name: true, slug: true } },
  images: {
    select: { r2Key: true, width: true, height: true, position: true },
    orderBy: { position: "asc" },
  },
  seller: { select: { tradeName: true, verified: true, createdAt: true } },
} satisfies Prisma.ListingSelect;

export type VehicleDetail = Prisma.ListingGetPayload<{ select: typeof detailSelect }>;

/** Solo PUBLISHED. Devuelve null si no existe (la página responde 404). */
async function fetchVehicleBySlug(slug: string): Promise<VehicleDetail | null> {
  needDb();
  return db.listing.findUnique({ where: { slug, status: "PUBLISHED" }, select: detailSelect });
}

/** Cacheado por request: generateMetadata + página comparten 1 sola query. */
export const getVehicleBySlug = cache(fetchVehicleBySlug);

/** Relacionados por puntaje explicable (ver related.ts): 1 query acotada + ranking. */
export async function getRelated(vehicle: {
  id: string;
  brandId: string;
  bodyType: string | null;
  fuel: string | null;
  priceMXN: number | null;
  year: number;
}): Promise<CatalogCard[]> {
  needDb();
  const or: Prisma.ListingWhereInput[] = [{ brandId: vehicle.brandId }];
  if (vehicle.bodyType) or.push({ bodyType: vehicle.bodyType as BodyType });
  const candidates = await db.listing.findMany({
    where: { status: "PUBLISHED", id: { not: vehicle.id }, OR: or },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      year: true,
      priceMXN: true,
      mileageKm: true,
      fuel: true,
      transmission: true,
      bodyType: true,
      condition: true,
      city: true,
      publishedAt: true,
      brandId: true,
      brand: { select: { name: true, slug: true } },
      carModel: { select: { name: true, slug: true } },
      images: { select: { r2Key: true }, orderBy: { position: "asc" }, take: 1 },
    },
    take: 50,
  });
  return rankRelated(vehicle, candidates, 4).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    year: c.year,
    priceMXN: c.priceMXN,
    mileageKm: c.mileageKm,
    fuel: c.fuel,
    transmission: c.transmission,
    bodyType: c.bodyType,
    condition: c.condition,
    city: c.city,
    publishedAt: c.publishedAt,
    brand: c.brand,
    carModel: c.carModel,
    images: c.images,
  }));
}

export type BrandWithCount = { slug: string; name: string; count: number };

export async function getBrandsWithCounts(): Promise<BrandWithCount[]> {
  needDb();
  const rows = await db.brand.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
    },
  });
  return rows
    .map((b) => ({ slug: b.slug, name: b.name, count: b._count.listings }))
    .filter((b) => b.count > 0);
}

export async function getModelsByBrand(brandSlug: string): Promise<Array<{ slug: string; name: string }>> {
  needDb();
  return db.carModel.findMany({
    where: { brand: { slug: brandSlug }, listings: { some: { status: "PUBLISHED" } } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
}

export async function getLatestPublished(take: number): Promise<CatalogCard[]> {
  needDb();
  return db.listing.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    select: cardSelect,
    take,
  });
}

const compareSelect = {
  id: true,
  slug: true,
  title: true,
  year: true,
  priceMXN: true,
  mileageKm: true,
  engine: true,
  powerHp: true,
  torqueNm: true,
  transmission: true,
  fuel: true,
  bodyType: true,
  condition: true,
  city: true,
  brand: { select: { name: true, slug: true } },
  carModel: { select: { name: true, slug: true } },
} satisfies Prisma.ListingSelect;

export type CompareVehicle = Prisma.ListingGetPayload<{ select: typeof compareSelect }>;

/** Vehículos publicados por slugs (comparador). Sin slug → lista vacía. */
export async function getVehiclesBySlugs(slugs: string[]): Promise<CompareVehicle[]> {
  needDb();
  if (slugs.length === 0) return [];
  return db.listing.findMany({
    where: { slug: { in: slugs }, status: "PUBLISHED" },
    select: compareSelect,
  });
}

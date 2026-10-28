import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Filtros del catálogo tal como llegan por URL (/cars?...). Fase 3: set completo,
// sorting y paginación. El `where` se ejecuta en Postgres; jamás se filtra en JS.

const positiveInt = z.coerce.number().int().positive();
const yearRange = z.coerce.number().int().min(1990).max(2100);

export const catalogFilterSchema = z.object({
  q: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  minPrice: positiveInt.optional(),
  maxPrice: positiveInt.optional(),
  minYear: yearRange.optional(),
  maxYear: yearRange.optional(),
  maxMileage: positiveInt.optional(),
  fuel: z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "CNG"]).optional(),
  transmission: z.enum(["MANUAL", "AUTOMATIC", "CVT"]).optional(),
  body: z
    .enum(["SEDAN", "SUV", "COUPE", "HATCHBACK", "PICKUP", "SPORT", "CONVERTIBLE", "VAN"])
    .optional(),
  condition: z.enum(["NEW", "USED", "CERTIFIED"]).optional(),
  city: z.string().trim().max(80).optional(),
  color: z.string().trim().max(40).optional(),
});

export type CatalogFilters = z.infer<typeof catalogFilterSchema>;

export const SORT_KEYS = [
  "featured",
  "price-asc",
  "price-desc",
  "newest",
  "mileage-asc",
  "year-desc",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const PAGE_SIZE = 12;

const querySchema = catalogFilterSchema.extend({
  sort: z.enum(SORT_KEYS).catch("featured"),
  // Tope anti-abuso: página 1000 = offset 12k máximo (DoS por offset gigante).
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export type CatalogQuery = z.infer<typeof querySchema>;

/** Next entrega string|string[]|undefined: normaliza a escalar antes de Zod. */
export function parseCatalogQuery(
  params: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      if (v[0] !== undefined) flat[k] = v[0];
    } else if (v !== undefined) {
      flat[k] = v;
    }
  }
  return querySchema.parse(flat);
}

export const SORT_ORDER: Record<SortKey, Prisma.ListingOrderByWithRelationInput[]> = {
  featured: [{ publishedAt: "desc" }],
  "price-asc": [{ priceMXN: "asc" }],
  "price-desc": [{ priceMXN: "desc" }],
  newest: [{ publishedAt: "desc" }],
  "mileage-asc": [{ mileageKm: "asc" }],
  "year-desc": [{ year: "desc" }],
};

/** Orden estable: criterio + desempate por id (paginación consistente). */
export function buildOrderBy(sort: SortKey): Prisma.ListingOrderByWithRelationInput[] {
  return [...SORT_ORDER[sort], { id: "asc" }];
}

/** Términos de búsqueda: minúsculas, sin ruido (1 letra), máx 5.
 *  "M3 BMW", "bmw m3" y "BMW M3" producen los mismos términos. */
export function searchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 5);
}

/** Construye el `where` sin tocar la DB (testeable, sin N+1 por diseño). */
export function buildVehicleWhere(filters: CatalogFilters): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [{ status: "PUBLISHED" }];

  const terms = filters.q ? searchTerms(filters.q) : [];
  for (const term of terms) {
    and.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { brand: { name: { contains: term, mode: "insensitive" } } },
        { carModel: { name: { contains: term, mode: "insensitive" } } },
      ],
    });
  }
  if (filters.brand) {
    and.push({ brand: { slug: filters.brand.toLowerCase() } });
  }
  if (filters.model) {
    and.push({ carModel: { slug: filters.model.toLowerCase() } });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    and.push({ priceMXN: { gte: filters.minPrice, lte: filters.maxPrice } });
  }
  if (filters.minYear !== undefined || filters.maxYear !== undefined) {
    and.push({ year: { gte: filters.minYear, lte: filters.maxYear } });
  }
  if (filters.maxMileage !== undefined) {
    and.push({ mileageKm: { lte: filters.maxMileage } });
  }
  if (filters.fuel) and.push({ fuel: filters.fuel });
  if (filters.transmission) and.push({ transmission: filters.transmission });
  if (filters.body) and.push({ bodyType: filters.body });
  if (filters.condition) and.push({ condition: filters.condition });
  if (filters.city) {
    and.push({ city: { contains: filters.city, mode: "insensitive" } });
  }
  if (filters.color) {
    and.push({ exteriorColor: { contains: filters.color, mode: "insensitive" } });
  }
  return { AND: and };
}

/** Total de páginas para un total y tamaño dados. */
export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

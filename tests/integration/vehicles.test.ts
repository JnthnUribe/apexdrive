/**
 * Integración Fase 3 — DB-gated (CI con Postgres; local sin DB: skip).
 * Fixtures propios: filtros combinados, slug inexistente, relacionados,
 * favorito idempotente + aislamiento entre usuarios.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
// next-auth no es resoluble en Vitest; se mockea (acciones bajo test no lo usan).
vi.mock("@/lib/auth", () => ({ signOut: vi.fn() }));
import { __resetRateLimits } from "@/lib/ratelimit";
import { hashPassword } from "@/lib/password";
import {
  getCatalogPage,
  getRelated,
  getVehicleBySlug,
  getVehiclesBySlugs,
} from "@/features/vehicles/queries";

const hasDb = Boolean(process.env["DATABASE_URL"]);
const runDb = hasDb ? describe : describe.skip;

const db = new PrismaClient();
const SFX = Date.now().toString(36);
const email = (n: string): string => `${n}+iveh${SFX}@apexdrive.mx`;

let sellerId = "";
let listingA = "";
let listingB = "";

beforeAll(async () => {
  if (!hasDb) return;
  await db.$connect();
  __resetRateLimits();
  const passwordHash = await hashPassword("claveSegura1234");
  const seller = await db.user.create({
    data: {
      email: email("seller"),
      passwordHash,
      role: "SELLER",
      profile: { create: { displayName: "Seller Veh" } },
      seller: { create: { tradeName: "Veh Motors" } },
    },
    include: { seller: true },
  });
  sellerId = seller.seller?.id ?? "";
  const brand = await db.brand.create({ data: { slug: `veh-${SFX}`, name: `Veh ${SFX}` } });
  const model = await db.carModel.create({ data: { brandId: brand.id, slug: "vm", name: "VM" } });
  const base = {
    sellerId,
    brandId: brand.id,
    carModelId: model.id,
    fuel: "PETROL" as const,
    transmission: "AUTOMATIC" as const,
    bodyType: "SUV" as const,
    condition: "USED" as const,
    city: "Mérida",
    description: "Fixture de test.",
    status: "PUBLISHED" as const,
    publishedAt: new Date(),
    isSeed: false,
  };
  const a = await db.listing.create({
    data: { ...base, slug: `veha-${SFX}`, title: "Veh A", year: 2022, priceMXN: 500000, mileageKm: 20000 },
  });
  const b = await db.listing.create({
    data: { ...base, slug: `vehb-${SFX}`, title: "Veh B", year: 2021, priceMXN: 300000, mileageKm: 60000 },
  });
  await db.listing.create({
    data: { ...base, slug: `vehc-${SFX}`, title: "Veh C", year: 2020, priceMXN: 200000, mileageKm: 90000, status: "DRAFT", publishedAt: null },
  });
  listingA = a.id;
  listingB = b.id;
});

afterAll(async () => {
  if (hasDb) {
    await db.user.deleteMany({ where: { email: { contains: `iveh${SFX}@` } } });
    await db.brand.deleteMany({ where: { slug: { startsWith: `veh-${SFX}` } } });
  }
  await db.$disconnect();
});

runDb("vehículos integración (DB)", () => {
  it("filtros combinados devuelven el subconjunto exacto (DRAFT excluido)", async () => {
    const page = await getCatalogPage({
      brand: `veh-${SFX}`,
      body: "SUV",
      minYear: 2021,
      maxPrice: 600000,
      sort: "price-asc",
      page: 1,
    });
    expect(page.total).toBe(2);
    expect(page.items.map((i) => i.slug).sort()).toEqual([`veha-${SFX}`, `vehb-${SFX}`].sort());
    // Orden precio asc: B primero.
    expect(page.items[0]?.slug).toBe(`vehb-${SFX}`);
  });

  it("slug inexistente → null (la página responde 404)", async () => {
    expect(await getVehicleBySlug(`no-existe-${SFX}`)).toBeNull();
  });

  it("relacionados excluyen al actual y a no publicados", async () => {
    const detail = await getVehicleBySlug(`veha-${SFX}`);
    expect(detail).not.toBeNull();
    if (!detail) throw new Error("fixture faltante");
    const related = await getRelated({
      id: listingA,
      brandId: detail.brandId,
      bodyType: detail.bodyType,
      fuel: detail.fuel,
      priceMXN: detail.priceMXN,
      year: detail.year,
    });
    const slugs = related.map((r) => r.slug);
    expect(slugs).toContain(`vehb-${SFX}`);
    expect(slugs).not.toContain(`veha-${SFX}`);
    expect(slugs).not.toContain(`vehc-${SFX}`);
  });

  it("getVehiclesBySlugs solo publicados", async () => {
    const rows = await getVehiclesBySlugs([`veha-${SFX}`, `vehc-${SFX}`]);
    expect(rows.map((r) => r.slug)).toEqual([`veha-${SFX}`]);
  });

  it("favorito idempotente y aislado por usuario", async () => {
    const other = await db.user.create({
      data: {
        email: email("other"),
        passwordHash: await hashPassword("claveSegura1234"),
        role: "USER",
        profile: { create: { displayName: "Other" } },
      },
    });
    // toggleFavorite exige sesión (se testea e2e en Fase 5); aquí se verifica
    // la guarda real: la constraint única impide duplicados a nivel DB.
    await db.favorite.create({ data: { userId: other.id, listingId: listingB } });
    await expect(
      db.favorite.create({ data: { userId: other.id, listingId: listingB } }),
    ).rejects.toThrow();
    // Otro usuario no ve el favorito ajeno.
    const sellerRow = await db.user.findUniqueOrThrow({ where: { email: email("seller") } });
    expect(
      await db.favorite.findUnique({
        where: { userId_listingId: { userId: sellerRow.id, listingId: listingB } },
      }),
    ).toBeNull();
    // Limpieza del duplicado intencional: queda 1 fila.
    expect(await db.favorite.count({ where: { listingId: listingB } })).toBe(1);
  });

  it("buildVehicleWhere con brand inexistente no rompe (0 resultados)", async () => {
    const page = await getCatalogPage({ brand: `nadie-${SFX}`, sort: "featured", page: 1 });
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });
});

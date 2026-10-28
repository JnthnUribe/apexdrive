/**
 * Integración Fase 5 — DB-gated (CI con Postgres; local: `npm run test:integration`
 * solo con DATABASE_URL real). Favoritos, comparativas, relacionados y búsqueda.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
vi.mock("@/lib/auth", () => ({ signOut: vi.fn() }));
import { deleteComparisonCore, listMyComparisons, saveComparisonCore } from "@/features/compare/actions";
import { getMyFavorites } from "@/features/favorites/queries";
import { getCatalogPage, getRelated } from "@/features/vehicles/queries";
import { hashPassword } from "@/lib/password";

const hasDb = Boolean(process.env["DATABASE_URL"]);
const runDb = hasDb ? describe : describe.skip;

const db = new PrismaClient();
const SFX = Date.now().toString(36);
const email = (n: string): string => `${n}+ieng${SFX}@apexdrive.mx`;

let ownerId = "";
const slugs: Record<string, string> = {};

async function makeListing(key: string, over: Record<string, unknown>): Promise<string> {
  const brand = await db.brand.upsert({
    where: { slug: `eng-${SFX}` },
    update: {},
    create: { slug: `eng-${SFX}`, name: `Eng ${SFX}` },
  });
  const model = await db.carModel.upsert({
    where: { brandId_slug: { brandId: brand.id, slug: "em" } },
    update: {},
    create: { brandId: brand.id, slug: "em", name: "EM" },
  });
  const seller = await db.seller.findUnique({ where: { userId: ownerId }, select: { id: true } });
  const row = await db.listing.create({
    data: {
      slug: `${key}-${SFX}`,
      title: `Eng ${key} M3 ${SFX}`,
      sellerId: (seller as { id: string }).id,
      brandId: brand.id,
      carModelId: model.id,
      year: 2022,
      priceMXN: 500000,
      mileageKm: 20000,
      fuel: "PETROL",
      transmission: "AUTOMATIC",
      bodyType: "SUV",
      condition: "USED",
      city: "Mérida",
      description: "Fixture de engagement para desarrollo.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      isSeed: false,
      ...over,
    },
  });
  slugs[key] = row.slug;
  return row.id;
}

beforeAll(async () => {
  if (!hasDb) return;
  await db.$connect();
  const user = await db.user.create({
    data: {
      email: email("owner"),
      passwordHash: await hashPassword("claveSegura1234"),
      role: "USER",
      profile: { create: { displayName: "Eng Owner" } },
      seller: { create: { tradeName: "Eng Motors" } },
    },
  });
  ownerId = user.id;
  await makeListing("m3", {});
  await makeListing("cercano", { priceMXN: 540000, year: 2023 });
  await makeListing("lejos", { priceMXN: 900000, year: 2010, fuel: "DIESEL", bodyType: "SEDAN" });
  await makeListing("draft", { status: "DRAFT", publishedAt: null });
});

afterAll(async () => {
  if (hasDb) {
    await db.favorite.deleteMany({ where: { user: { email: { contains: `ieng${SFX}@` } } } });
    await db.comparison.deleteMany({ where: { user: { email: { contains: `ieng${SFX}@` } } } });
    await db.listing.deleteMany({ where: { slug: { endsWith: `-${SFX}` } } });
    await db.user.deleteMany({ where: { email: { contains: `ieng${SFX}@` } } });
    await db.carModel.deleteMany({ where: { brand: { slug: `eng-${SFX}` } } });
    await db.brand.deleteMany({ where: { slug: `eng-${SFX}` } });
  }
  await db.$disconnect();
});

runDb("engagement integración (DB)", () => {
  it("búsqueda tolerante: 'M3 BMW' y 'bmw m3' encuentran lo mismo", async () => {
    const a = await getCatalogPage({ q: "M3 BMW", sort: "featured", page: 1 });
    const b = await getCatalogPage({ q: "bmw m3", sort: "featured", page: 1 });
    expect(a.total).toBeGreaterThanOrEqual(3);
    expect(a.items.map((i) => i.slug).sort()).toEqual(b.items.map((i) => i.slug).sort());
    expect(a.items.map((i) => i.slug)).toContain(slugs["m3"]);
  });

  it("relacionados: mismo segmento primero, DRAFT excluido", async () => {
    const target = await db.listing.findUniqueOrThrow({
      where: { slug: slugs["m3"] as string },
      select: { id: true, brandId: true, bodyType: true, fuel: true, priceMXN: true, year: true },
    });
    const related = await getRelated(target);
    const order = related.map((r) => r.slug);
    expect(order[0]).toBe(slugs["cercano"]);
    expect(order).not.toContain(slugs["m3"]);
    expect(order).not.toContain(slugs["draft"]);
  });

  it("favoritos: solo míos y solo publicados", async () => {
    const other = await db.user.create({
      data: {
        email: email("other"),
        passwordHash: await hashPassword("claveSegura1234"),
        role: "USER",
        profile: { create: { displayName: "Other" } },
      },
    });
    const pub = await db.listing.findUniqueOrThrow({ where: { slug: slugs["m3"] as string } });
    const drf = await db.listing.findUniqueOrThrow({ where: { slug: slugs["draft"] as string } });
    await db.favorite.create({ data: { userId: ownerId, listingId: pub.id } });
    await db.favorite.create({ data: { userId: ownerId, listingId: drf.id } });
    await db.favorite.create({ data: { userId: other.id, listingId: pub.id } });
    const mine = await getMyFavorites(ownerId);
    expect(mine.map((f) => f.slug)).toEqual([slugs["m3"]]);
  });

  it("comparativas: guarda 2–4 publicados, rechaza draft, borrado ajeno falla", async () => {
    const saved = await saveComparisonCore(ownerId, "Mis SUV", [slugs["m3"] as string, slugs["cercano"] as string]);
    expect(saved.id).toBeDefined();
    const listed = await listMyComparisons(ownerId);
    expect(listed.map((c) => c.id)).toContain(saved.id);
    await expect(
      saveComparisonCore(ownerId, "Mala", [slugs["m3"] as string, slugs["draft"] as string]),
    ).rejects.toThrow(/no está publicado/i);
    await expect(saveComparisonCore(ownerId, "Uno", [slugs["m3"] as string])).rejects.toThrow(/al menos 2/i);
    const other = await db.user.findUniqueOrThrow({ where: { email: email("other") } });
    await expect(deleteComparisonCore(other.id, saved.id)).rejects.toThrow(/no encontrada/i);
  });
});

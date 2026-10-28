/**
 * Integración Fase 4 — DB-gated (CI con Postgres; local: `npm run test:integration`
 * solo con DATABASE_URL real). Ataca activamente el ownership y la máquina de estados.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
vi.mock("@/lib/auth", () => ({ signOut: vi.fn() }));
import type { Actor } from "@/features/listings/drafts";
import {
  addPhoto,
  archiveListing,
  createDraft,
  markSold,
  submitForReview,
  updateDraftStep,
  updatePrice,
} from "@/features/listings/drafts";
import { hashPassword } from "@/lib/password";

const hasDb = Boolean(process.env["DATABASE_URL"]);
const runDb = hasDb ? describe : describe.skip;

const db = new PrismaClient();
const SFX = Date.now().toString(36);
const email = (n: string): string => `${n}+ipub${SFX}@apexdrive.mx`;

let sellerA: Actor;
let sellerB: Actor;
let plainUser: Actor;

async function makeUser(n: string, role: "USER" | "SELLER"): Promise<Actor> {
  const row = await db.user.create({
    data: {
      email: email(n),
      passwordHash: await hashPassword("claveSegura1234"),
      role,
      profile: { create: { displayName: n } },
    },
  });
  return { userId: row.id, role };
}

beforeAll(async () => {
  if (!hasDb) return;
  await db.$connect();
  sellerA = await makeUser("a", "SELLER");
  sellerB = await makeUser("b", "SELLER");
  plainUser = await makeUser("u", "USER");
  const brand = await db.brand.create({ data: { slug: `pub-${SFX}`, name: `Pub ${SFX}` } });
  await db.carModel.create({ data: { brandId: brand.id, slug: "ma", name: "MA" } });
  await db.carModel.create({ data: { brandId: brand.id, slug: "mb", name: "MB" } });
});

afterAll(async () => {
  if (hasDb) {
    await db.listing.deleteMany({ where: { seller: { user: { email: { contains: `ipub${SFX}@` } } } } });
    await db.user.deleteMany({ where: { email: { contains: `ipub${SFX}@` } } });
    await db.carModel.deleteMany({ where: { brand: { slug: `pub-${SFX}` } } });
    await db.brand.deleteMany({ where: { slug: `pub-${SFX}` } });
  }
  await db.$disconnect();
});

const step1 = { brandSlug: `pub-${SFX}`, modelSlug: "ma", year: 2021, condition: "USED" };

runDb("publicación integración (DB)", () => {
  it("USER no puede crear borradores", async () => {
    await expect(createDraft(plainUser, step1)).rejects.toThrow(/vendedor/i);
  });

  it("flujo feliz: crear → pasos → foto → submit → PENDING (nunca PUBLISHED)", async () => {
    const created = await createDraft(sellerA, step1);
    expect(created.draftId).toBeDefined();
    const id = created.draftId as string;
    await updateDraftStep(sellerA, id, 2, { mileageKm: 30000, fuel: "PETROL", transmission: "MANUAL", bodyType: "SEDAN" });
    await updateDraftStep(sellerA, id, 4, { city: "Mérida", description: "Auto en excelente estado general, único dueño, servicios de agencia al corriente siempre." });
    await updateDraftStep(sellerA, id, 6, { priceMXN: 250000 });
    await addPhoto(sellerA, id, "https://example.com/foto.jpg");
    const res = await submitForReview(sellerA, id);
    expect(res.ok).toBe(true);
    const row = await db.listing.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe("PENDING");
  });

  it("modelo de otra marca se rechaza (anti-manipulación)", async () => {
    const other = await db.brand.create({ data: { slug: `otra-${SFX}`, name: `Otra ${SFX}` } });
    const om = await db.carModel.create({ data: { brandId: other.id, slug: "om", name: "OM" } });
    await expect(
      createDraft(sellerA, { ...step1, modelSlug: om.slug }),
    ).rejects.toThrow(/no válido/i);
  });

  it("ATAQUE: B no toca nada de A (update/submit/foto → NOT_FOUND)", async () => {
    const created = await createDraft(sellerA, step1);
    const id = created.draftId as string;
    await expect(updateDraftStep(sellerB, id, 2, { mileageKm: 1, fuel: "PETROL", transmission: "MANUAL", bodyType: "SEDAN" })).rejects.toThrow(/no encontrada/i);
    await expect(submitForReview(sellerB, id)).rejects.toThrow(/no encontrada/i);
    await expect(addPhoto(sellerB, id, "https://example.com/x.jpg")).rejects.toThrow(/no encontrada/i);
    // Y el borrador de A sigue intacto en DRAFT.
    expect((await db.listing.findUniqueOrThrow({ where: { id } })).status).toBe("DRAFT");
  });

  it("ATAQUE: publicar incompleto se rechaza con detalle", async () => {
    const created = await createDraft(sellerA, step1);
    await expect(submitForReview(sellerA, created.draftId as string)).rejects.toThrow(/falta completar/i);
  });
  it("ATAQUE: editar publicado por pasos se rechaza; precio sí se puede", async () => {
    const created = await createDraft(sellerA, { ...step1, modelSlug: "mb" });
    const id = created.draftId as string;
    await db.listing.update({ where: { id }, data: { status: "PUBLISHED", priceMXN: 100000, mileageKm: 1000, fuel: "PETROL", transmission: "MANUAL", bodyType: "SEDAN", city: "X", description: "Y".repeat(60) } });
    await expect(
      updateDraftStep(sellerA, id, 2, { mileageKm: 2, fuel: "PETROL", transmission: "MANUAL", bodyType: "SEDAN" }),
    ).rejects.toThrow(/no es editable/i);
    const ok = await updatePrice(sellerA, id, { priceMXN: 120000 });
    expect(ok.ok).toBe(true);
    // ...pero B no puede ni el precio.
    await expect(updatePrice(sellerB, id, { priceMXN: 1 })).rejects.toThrow(/no encontrada/i);
  });

  it("ATAQUE: vender/archivar ajeno falla; propio funciona con máquina de estados", async () => {
    const created = await createDraft(sellerA, step1);
    const id = created.draftId as string;
    await db.listing.update({ where: { id }, data: { status: "PUBLISHED", priceMXN: 100000, mileageKm: 1000, fuel: "PETROL", transmission: "MANUAL", bodyType: "SEDAN", city: "X", description: "Y".repeat(60) } });
    await expect(markSold(sellerB, id)).rejects.toThrow(/no encontrada/i);
    await expect(archiveListing(sellerB, id)).rejects.toThrow(/no encontrada/i);
    expect((await markSold(sellerA, id)).ok).toBe(true);
    expect((await db.listing.findUniqueOrThrow({ where: { id } })).status).toBe("SOLD");
    // SOLD no se puede vender dos veces.
    await expect(markSold(sellerA, id)).rejects.toThrow();
    expect((await archiveListing(sellerA, id)).ok).toBe(true);
  });

  it("fotos: URL inválida y límite 12 se hacen cumplir", async () => {
    const created = await createDraft(sellerA, step1);
    const id = created.draftId as string;
    await expect(addPhoto(sellerA, id, "http://inseguro.com/f.jpg")).rejects.toThrow();
    await expect(addPhoto(sellerA, id, "https://a.com/f.exe")).rejects.toThrow();
    for (let i = 0; i < 12; i++) {
      await addPhoto(sellerA, id, `https://a.com/f${i}.jpg`);
    }
    await expect(addPhoto(sellerA, id, "https://a.com/f13.jpg")).rejects.toThrow(/máximo 12/i);
  });
});

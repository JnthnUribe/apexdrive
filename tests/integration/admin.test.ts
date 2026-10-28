/**
 * Integración Fase 6 — DB-gated (CI con Postgres). Administración y moderación:
 * roles exigidos en el núcleo, flujos approve/reject/hide, bloqueo con revocación,
 * reportes y auditoría. Los ataques deben fallar con FORBIDDEN/NOT_FOUND.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
vi.mock("@/lib/auth", () => ({ signOut: vi.fn() }));
import {
  moderateCore,
  resolveReportCore,
  setUserStatusCore,
} from "@/features/admin/actions";
import { createDraft } from "@/features/listings/drafts";
import { hashPassword } from "@/lib/password";

const hasDb = Boolean(process.env["DATABASE_URL"]);
const runDb = hasDb ? describe : describe.skip;

const db = new PrismaClient();
const SFX = Date.now().toString(36);
const email = (n: string): string => `${n}+iadm${SFX}@apexdrive.mx`;

let adminId = "";
let sellerId = "";
let userId = "";
let pendingId = "";

async function makeUser(n: string, role: "USER" | "SELLER" | "ADMIN"): Promise<string> {
  const row = await db.user.create({
    data: {
      email: email(n),
      passwordHash: await hashPassword("claveSegura1234"),
      role,
      profile: { create: { displayName: n } },
    },
  });
  return row.id;
}

beforeAll(async () => {
  if (!hasDb) return;
  await db.$connect();
  adminId = await makeUser("admin", "ADMIN");
  const sellerRowId = await makeUser("seller", "SELLER");
  sellerId = sellerRowId;
  userId = await makeUser("user", "USER");
  const brand = await db.brand.create({ data: { slug: `adm-${SFX}`, name: `Adm ${SFX}` } });
  await db.carModel.create({ data: { brandId: brand.id, slug: "am", name: "AM" } });
  const created = await createDraft({ userId: sellerRowId, role: "SELLER" }, {
    brandSlug: `adm-${SFX}`,
    modelSlug: "am",
    year: 2021,
    condition: "USED",
  });
  pendingId = created.draftId as string;
  await db.listing.update({
    where: { id: pendingId },
    data: {
      status: "PENDING",
      priceMXN: 200000,
      mileageKm: 10000,
      fuel: "PETROL",
      transmission: "MANUAL",
      bodyType: "SEDAN",
      city: "Mérida",
      description: "Completa para moderación. ".repeat(10),
    },
  });
  await db.vehicleImage.create({ data: { listingId: pendingId, r2Key: "https://a.com/f.jpg", position: 0, isPrimary: true } });
});

afterAll(async () => {
  if (hasDb) {
    await db.adminAction.deleteMany({ where: { admin: { email: { contains: `iadm${SFX}@` } } } });
    await db.report.deleteMany({ where: { reporter: { email: { contains: `iadm${SFX}@` } } } });
    await db.listing.deleteMany({ where: { seller: { user: { email: { contains: `iadm${SFX}@` } } } } });
    await db.user.deleteMany({ where: { email: { contains: `iadm${SFX}@` } } });
    await db.carModel.deleteMany({ where: { brand: { slug: `adm-${SFX}` } } });
    await db.brand.deleteMany({ where: { slug: `adm-${SFX}` } });
  }
  await db.$disconnect();
});

async function auditCount(action: string): Promise<number> {
  return db.adminAction.count({ where: { adminId, action } });
}

runDb("admin integración (DB)", () => {
  it("ATAQUE: USER y SELLER llamando moderación → FORBIDDEN", async () => {
    await expect(moderateCore(userId, pendingId, "approve")).rejects.toThrow(/administrador/i);
    await expect(moderateCore(sellerId, pendingId, "approve")).rejects.toThrow(/administrador/i);
    await expect(setUserStatusCore(userId, sellerId, "BLOCKED")).rejects.toThrow(/administrador/i);
    expect((await db.listing.findUniqueOrThrow({ where: { id: pendingId } })).status).toBe("PENDING");
  });

  it("approve publica con fecha y audita; repetir falla", async () => {
    const before = await auditCount("approve");
    const res = await moderateCore(adminId, pendingId, "approve");
    expect(res.ok).toBe(true);
    const row = await db.listing.findUniqueOrThrow({ where: { id: pendingId } });
    expect(row.status).toBe("PUBLISHED");
    expect(row.publishedAt).not.toBeNull();
    expect(await auditCount("approve")).toBe(before + 1);
    await expect(moderateCore(adminId, pendingId, "approve")).rejects.toThrow(/solo PENDING/i);
  });

  it("hide solo sobre PUBLISHED y audita; reject sobre PUBLISHED falla", async () => {
    await expect(moderateCore(adminId, pendingId, "reject")).rejects.toThrow(/solo PENDING/i);
    const res = await moderateCore(adminId, pendingId, "hide", "Contenido duplicado");
    expect(res.ok).toBe(true);
    expect((await db.listing.findUniqueOrThrow({ where: { id: pendingId } })).status).toBe("ARCHIVED");
    const audit = await db.adminAction.findFirstOrThrow({ where: { adminId, action: "hide" } });
    expect(audit.reason).toBe("Contenido duplicado");
  });

  it("bloqueo revoca sesiones (tokenVersion++); self y admins protegidos", async () => {
    const before = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { tokenVersion: true } });
    const res = await setUserStatusCore(adminId, userId, "BLOCKED");
    expect(res.ok).toBe(true);
    const after = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { status: true, tokenVersion: true } });
    expect(after.status).toBe("BLOCKED");
    expect(after.tokenVersion).toBe(before.tokenVersion + 1);
    await expect(setUserStatusCore(adminId, adminId, "BLOCKED")).rejects.toThrow(/propio/i);
    const otherAdmin = await makeUser("admin2", "ADMIN");
    await expect(setUserStatusCore(adminId, otherAdmin, "BLOCKED")).rejects.toThrow(/otro administrador/i);
    await expect(setUserStatusCore(adminId, userId, "BLOCKED")).rejects.toThrow(/ya está/i);
  });

  it("reportes: crear→resolver con auditoría; doble resolve falla", async () => {
    const pub = await db.listing.create({
      data: {
        slug: `admrep-${SFX}`,
        title: "Reportable",
        seller: { connect: { userId: sellerId } },
        brand: { connect: { slug: `adm-${SFX}` } },
        carModel: { connect: { brandId_slug: { brandId: (await db.brand.findUniqueOrThrow({ where: { slug: `adm-${SFX}` } })).id, slug: "am" } } },
        year: 2020,
        priceMXN: 100000,
        mileageKm: 5000,
        fuel: "PETROL",
        transmission: "MANUAL",
        bodyType: "SEDAN",
        condition: "USED",
        city: "Mérida",
        description: "Reportable. ".repeat(10),
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    const report = await db.report.create({
      data: { reporterId: userId, listingId: pub.id, reason: "SPAM" },
    });
    const res = await resolveReportCore(adminId, report.id, "RESOLVED");
    expect(res.ok).toBe(true);
    expect(await auditCount("resolve")).toBe(1);
    await expect(resolveReportCore(adminId, report.id, "DISMISSED")).rejects.toThrow(/ya atendido/i);
  });

  it("índice parcial: segundo OPEN idéntico falla a nivel DB (P2002)", async () => {
    const target = await db.listing.findFirstOrThrow({
      where: { slug: { endsWith: `-${SFX}` }, status: "PUBLISHED" },
    });
    await db.report.create({ data: { reporterId: userId, listingId: target.id, reason: "OTHER" } });
    await expect(
      db.report.create({ data: { reporterId: userId, listingId: target.id, reason: "SPAM" } }),
    ).rejects.toThrow();
    // Tras resolver, se permite reportar de nuevo.
    const first = await db.report.findFirstOrThrow({
      where: { reporterId: userId, listingId: target.id, status: "OPEN" },
    });
    await resolveReportCore(adminId, first.id, "RESOLVED");
    await db.report.create({ data: { reporterId: userId, listingId: target.id, reason: "SPAM" } });
    const second = await db.report.findFirstOrThrow({
      where: { reporterId: userId, listingId: target.id, status: "OPEN" },
    });
    await resolveReportCore(adminId, second.id, "DISMISSED");
  });

  it("métricas del admin corren y cuadran", async () => {
    const { getAdminMetrics } = await import("@/features/admin/queries");
    const m = await getAdminMetrics();
    expect(m.users).toBeGreaterThanOrEqual(3);
    expect(m.openReports).toBeGreaterThanOrEqual(0);
    expect(Object.values(m.listingsByStatus).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
  });
});

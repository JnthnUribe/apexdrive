/**
 * Integración Fase 2 — corre SOLO con DATABASE_URL (CI: servicio Postgres).
 * Local sin DB: se omite (skip) con aviso, no falla.
 * Cubre: registro real, anti-elevación, flujo reset completo, IDOR vs filas reales.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
// next-auth no es resoluble en Vitest (sus internos exigen el runtime Next).
// Se mockea el router de auth; las acciones bajo test no lo usan.
vi.mock("@/lib/auth", () => ({ signOut: vi.fn() }));
import { forgotAction, registerAction, resetAction } from "@/features/auth/actions";
import { verifyCredentials } from "@/lib/credentials";
import { canAccessAdmin, canEditListing } from "@/lib/authz";
import { __resetRateLimits } from "@/lib/ratelimit";
import { hashPassword } from "@/lib/password";

const hasDb = Boolean(process.env["DATABASE_URL"]);
// Sin DB el suite se omite (skip) con aviso; en CI con Postgres corre completo.
const runDb = hasDb ? describe : describe.skip;

const db = new PrismaClient();
const SFX = Date.now().toString(36);
const email = (n: string): string => `${n}+itest${SFX}@apexdrive.mx`;
const fd = (entries: Record<string, string>): FormData => {
  const form = new FormData();
  for (const [k, v] of Object.entries(entries)) form.append(k, v);
  return form;
};

beforeAll(async () => {
  if (hasDb) await db.$connect();
});

afterAll(async () => {
  if (hasDb) {
    await db.user.deleteMany({ where: { email: { contains: `itest${SFX}@` } } });
    await db.brand.deleteMany({ where: { slug: { startsWith: `itest-${SFX}` } } });
  }
  await db.$disconnect();
});

runDb("auth integración (DB)", () => {
  it("registro crea USER y no permite elevar a ADMIN vía formulario", async () => {
    __resetRateLimits();
    const res = await registerAction(
      null,
      fd({ email: email("nuevo"), password: "claveSegura123", displayName: "Itest", role: "ADMIN" }),
    );
    expect(res.ok).toBe(true);
    const row = await db.user.findUniqueOrThrow({ where: { email: email("nuevo") } });
    expect(row.role).toBe("USER");
  });

  it("duplicado responde idéntico y no crea segunda fila", async () => {
    __resetRateLimits();
    const first = await registerAction(
      null,
      fd({ email: email("dup"), password: "claveSegura123", displayName: "Dup" }),
    );
    const second = await registerAction(
      null,
      fd({ email: email("dup"), password: "otraClave12345", displayName: "Dup" }),
    );
    expect(first).toEqual(second);
    expect(await db.user.count({ where: { email: email("dup") } })).toBe(1);
  });

  it("flujo reset completo: token un solo uso e invalida password anterior", async () => {
    __resetRateLimits();
    const mail = email("reset");
    await registerAction(null, fd({ email: mail, password: "claveVieja1234", displayName: "R" }));
    const forgot = await forgotAction(null, fd({ email: mail }));
    expect(forgot.ok).toBe(true);
    expect(forgot.devPreview).toMatch(/token=[0-9a-f]{64}/);
    const token = new URL(forgot.devPreview as string).searchParams.get("token") as string;

    const bad = await resetAction(null, fd({ token: "0".repeat(64), password: "claveNueva1234" }));
    expect(bad.ok).toBe(false);

    const good = await resetAction(null, fd({ token, password: "claveNueva1234" }));
    expect(good.ok).toBe(true);
    expect(await verifyCredentials(mail, "claveNueva1234")).not.toBeNull();
    expect(await verifyCredentials(mail, "claveVieja1234")).toBeNull();

    const reuse = await resetAction(null, fd({ token, password: "otraClave12345" }));
    expect(reuse.ok).toBe(false);
  });

  it("IDOR vs filas reales: dueño sí, ajeno no, admin sí; bloqueado nunca", async () => {
    const [owner, other] = await Promise.all(
      [email("owner"), email("other")].map(async (m, i) => {
        const passwordHash = await hashPassword(`claveSegura12${i}`);
        return db.user.create({
          data: {
            email: m,
            passwordHash,
            role: i === 0 ? "SELLER" : "USER",
            profile: { create: { displayName: m } },
            ...(i === 0 ? { seller: { create: { tradeName: "Itest Motors" } } } : {}),
          },
          include: { seller: true },
        });
      }),
    );
    if (!owner || !other) throw new Error("setup de test falló");
    const admin = await db.user.create({
      data: {
        email: email("admin"),
        passwordHash: await hashPassword("claveSegura120"),
        role: "ADMIN",
        profile: { create: { displayName: "Admin" } },
      },
    });
    const brand = await db.brand.create({ data: { slug: `itest-${SFX}`, name: `Itest ${SFX}` } });
    const model = await db.carModel.create({
      data: { brandId: brand.id, slug: "m", name: "M" },
    });
    const listing = await db.listing.create({
      data: {
        slug: `itest-${SFX}`,
        sellerId: owner.seller?.id as string,
        brandId: brand.id,
        carModelId: model.id,
        title: "Itest",
        year: 2020,
        priceMXN: 100000,
        mileageKm: 10000,
        fuel: "PETROL",
        transmission: "MANUAL",
        bodyType: "SEDAN",
        condition: "USED",
        city: "Mérida",
        description: "Fila de test.",
        status: "DRAFT",
        isSeed: false,
      },
      include: { seller: { select: { userId: true } } },
    });

    const sess = (u: { id: string; role: "USER" | "SELLER" | "ADMIN"; status: "ACTIVE" | "BLOCKED" }) => ({
      id: u.id,
      role: u.role,
      status: u.status,
    });
    expect(canEditListing(sess({ ...owner, status: "ACTIVE" }), listing)).toBe(true);
    expect(canEditListing(sess({ ...other, status: "ACTIVE" }), listing)).toBe(false);
    expect(canEditListing(sess({ ...admin, status: "ACTIVE" }), listing)).toBe(true);
    expect(canEditListing(sess({ ...owner, status: "BLOCKED" }), listing)).toBe(false);
    expect(canAccessAdmin(sess({ ...other, status: "ACTIVE" }))).toBe(false);
    expect(await verifyCredentials(other.email, "no-es-la-clave-123")).toBeNull();
  });
});

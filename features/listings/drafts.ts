import { Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/format";
import {
  MAX_PHOTOS,
  assertPublishable,
  parseFeatures,
  photoSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step6Schema,
  validateFeatures,
} from "./schema";
import { canTransition, editableSteps } from "./transitions";

// Lógica de publicación con actor explícito (sin sesión): testeable contra DB
// real sin mockear Auth.js. actions.ts agrega requireFreshUser encima.
// Reglas: owner-only (ADMIN entra en Fase 7), máquina de estados estricta,
// borrador incremental, publicación SIEMPRE vía PENDING (moderación).

export type Actor = { userId: string; role: Role };
export type CoreResult = { ok: boolean; message: string; draftId?: string };

type OwnedDraft = Prisma.ListingGetPayload<{
  include: {
    seller: { select: { userId: true } };
    images: { orderBy: { position: "asc" } };
    brand: true;
    carModel: true;
  };
}>;

/** Solo SELLER/ADMIN publican; crea la fila Seller si falta. */
export async function sellerOf(actor: Actor): Promise<{ id: string }> {
  if (actor.role !== "SELLER" && actor.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Se requiere una cuenta de vendedor para publicar.");
  }
  const existing = await db.seller.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });
  if (existing) return existing;
  return db.seller.create({ data: { userId: actor.userId }, select: { id: true } });
}

/** Borrador propio o 404 (también si es ajeno: no filtrar existencia). */
export async function ownedDraft(actor: Actor, draftId: string): Promise<OwnedDraft> {
  const draft = await db.listing.findUnique({
    where: { id: draftId },
    include: {
      seller: { select: { userId: true } },
      images: { orderBy: { position: "asc" } },
      brand: true,
      carModel: true,
    },
  });
  if (!draft || draft.seller.userId !== actor.userId) {
    throw new AppError("NOT_FOUND", "Publicación no encontrada.");
  }
  return draft;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

async function uniqueSlug(baseRaw: string): Promise<string> {
  const base = slugify(baseRaw) || "auto";
  for (let i = 0; i < 3; i++) {
    const slug = i === 0 ? base : `${base}-${randomSuffix()}`;
    const taken = await db.listing.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
  }
  return `${base}-${randomSuffix()}${Date.now().toString(36)}`;
}

function buildTitle(brand: string, model: string, version: string | undefined, year: number): string {
  return `${brand} ${model}${version ? ` ${version}` : ""} ${year}`.trim();
}

/** Paso 1: crea el borrador (únicos NOT NULL exigidos a esta altura). */
export async function createDraft(actor: Actor, input: unknown): Promise<CoreResult> {
  const data = step1Schema.parse(input);
  const brand = await db.brand.findUnique({ where: { slug: data.brandSlug.toLowerCase() } });
  if (!brand) throw new AppError("UNPROCESSABLE", "Marca no disponible.");
  const model = await db.carModel.findUnique({
    where: { brandId_slug: { brandId: brand.id, slug: data.modelSlug.toLowerCase() } },
  });
  if (!model) throw new AppError("UNPROCESSABLE", "Modelo no válido para esa marca.");
  const seller = await sellerOf(actor);
  const slug = await uniqueSlug(buildTitle(brand.name, model.name, data.version, data.year));
  const draft = await db.listing.create({
    data: {
      slug,
      sellerId: seller.id,
      brandId: brand.id,
      carModelId: model.id,
      title: buildTitle(brand.name, model.name, data.version, data.year),
      version: data.version || null,
      year: data.year,
      condition: data.condition,
      status: "DRAFT",
    },
    select: { id: true },
  });
  return { ok: true, message: "Borrador creado.", draftId: draft.id };
}

/** Pasos 1–4 y 6 sobre DRAFT/REJECTED (6 también vía updatePrice si PUBLISHED). */
export async function updateDraftStep(
  actor: Actor,
  draftId: string,
  step: number,
  input: unknown,
): Promise<CoreResult> {
  const draft = await ownedDraft(actor, draftId);
  if (draft.status === "PUBLISHED" && step === 6) {
    return updatePrice(actor, draftId, input);
  }
  if (!editableSteps(draft.status).includes(step)) {
    throw new AppError("FORBIDDEN", `El paso ${step} no es editable en estado ${draft.status}.`);
  }
  switch (step) {
    case 1: {
      const data = step1Schema.parse(input);
      const brand = await db.brand.findUnique({ where: { slug: data.brandSlug.toLowerCase() } });
      if (!brand) throw new AppError("UNPROCESSABLE", "Marca no disponible.");
      const model = await db.carModel.findUnique({
        where: { brandId_slug: { brandId: brand.id, slug: data.modelSlug.toLowerCase() } },
      });
      if (!model) throw new AppError("UNPROCESSABLE", "Modelo no válido para esa marca.");
      await db.listing.update({
        where: { id: draft.id },
        data: {
          brandId: brand.id,
          carModelId: model.id,
          version: data.version || null,
          year: data.year,
          condition: data.condition,
          title: buildTitle(brand.name, model.name, data.version, data.year),
        },
      });
      break;
    }
    case 2: {
      const data = step2Schema.parse(input);
      await db.listing.update({
        where: { id: draft.id },
        data: {
          mileageKm: data.mileageKm,
          fuel: data.fuel,
          transmission: data.transmission,
          bodyType: data.bodyType,
          engine: data.engine || null,
          powerHp: data.powerHp ?? null,
          torqueNm: data.torqueNm ?? null,
          exteriorColor: data.exteriorColor || null,
          interiorColor: data.interiorColor || null,
        },
      });
      break;
    }
    case 3: {
      const raw = step3Schema.parse(input);
      const list = parseFeatures(raw.featuresText);
      const problem = validateFeatures(list);
      if (problem) throw new AppError("UNPROCESSABLE", problem);
      await db.listing.update({ where: { id: draft.id }, data: { features: list } });
      break;
    }
    case 4: {
      const data = step4Schema.parse(input);
      await db.listing.update({
        where: { id: draft.id },
        data: { city: data.city, description: data.description },
      });
      break;
    }
    case 6: {
      const data = step6Schema.parse(input);
      await db.listing.update({ where: { id: draft.id }, data: { priceMXN: data.priceMXN } });
      break;
    }
    default:
      throw new AppError("UNPROCESSABLE", `Paso ${step} sin formulario editable.`);
  }
  return { ok: true, message: "Paso guardado en el borrador." };
}

export async function addPhoto(actor: Actor, draftId: string, url: string): Promise<CoreResult> {
  const draft = await ownedDraft(actor, draftId);
  if (draft.status !== "DRAFT" && draft.status !== "REJECTED") {
    throw new AppError("FORBIDDEN", "Solo se agregan fotos en borrador o rechazado.");
  }
  const data = photoSchema.parse({ url });
  // Posición con reintento: dos altas concurrentes pueden colisionar en
  // @@unique([listingId, position]); el conteo se relee en cada intento.
  for (let attempt = 0; attempt < 3; attempt++) {
    const count = await db.vehicleImage.count({ where: { listingId: draft.id } });
    if (count >= MAX_PHOTOS) {
      throw new AppError("CONFLICT", `Máximo ${MAX_PHOTOS} fotografías.`);
    }
    const top = await db.vehicleImage.findFirst({
      where: { listingId: draft.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    try {
      await db.vehicleImage.create({
        data: {
          listingId: draft.id,
          r2Key: data.url,
          position: top ? top.position + 1 : 0,
          isPrimary: count === 0,
        },
      });
      return { ok: true, message: "Fotografía agregada." };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        attempt < 2
      ) {
        continue;
      }
      throw err;
    }
  }
  throw new AppError("CONFLICT", "No se pudo asignar posición. Inténtalo de nuevo.");
}

export async function removePhoto(actor: Actor, draftId: string, photoId: string): Promise<CoreResult> {
  const draft = await ownedDraft(actor, draftId);
  if (draft.status !== "DRAFT" && draft.status !== "REJECTED") {
    throw new AppError("FORBIDDEN", "Solo se eliminan fotos en borrador o rechazado.");
  }
  const photo = draft.images.find((i) => i.id === photoId);
  if (!photo) throw new AppError("NOT_FOUND", "Fotografía no encontrada.");
  await db.vehicleImage.delete({ where: { id: photo.id } });
  if (photo.isPrimary) {
    const next = await db.vehicleImage.findFirst({
      where: { listingId: draft.id },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    if (next) {
      await db.vehicleImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }
  return { ok: true, message: "Fotografía eliminada." };
}

/** Envío a revisión: gate de completitud + transición a PENDING (nunca PUBLISHED). */
export async function submitForReview(actor: Actor, draftId: string): Promise<CoreResult> {
  const draft = await ownedDraft(actor, draftId);
  if (draft.status !== "DRAFT" && draft.status !== "REJECTED") {
    throw new AppError("CONFLICT", `No se puede enviar en estado ${draft.status}.`);
  }
  const missing = assertPublishable({
    brandId: draft.brandId,
    carModelId: draft.carModelId,
    year: draft.year,
    condition: draft.condition,
    mileageKm: draft.mileageKm,
    fuel: draft.fuel,
    transmission: draft.transmission,
    bodyType: draft.bodyType,
    city: draft.city,
    description: draft.description,
    priceMXN: draft.priceMXN,
    photoCount: draft.images.length,
  });
  if (missing.length > 0) {
    throw new AppError("UNPROCESSABLE", `Falta completar: ${missing.join(" ")}`);
  }
  if (!canTransition(draft.status, "PENDING")) {
    throw new AppError("CONFLICT", "Transición no permitida.");
  }
  await db.listing.update({ where: { id: draft.id }, data: { status: "PENDING" } });
  return { ok: true, message: "Enviada a revisión. Te avisaremos cuando se publique." };
}

/** Precio sobre PUBLISHED (único campo editable publicado). */
export async function updatePrice(actor: Actor, draftId: string, input: unknown): Promise<CoreResult> {
  const draft = await ownedDraft(actor, draftId);
  if (draft.status !== "PUBLISHED") {
    throw new AppError("FORBIDDEN", "El precio directo solo aplica a publicados. Edita el borrador.");
  }
  const data = step6Schema.parse(input);
  await db.listing.update({ where: { id: draft.id }, data: { priceMXN: data.priceMXN } });
  return { ok: true, message: "Precio actualizado." };
}

export async function markSold(actor: Actor, draftId: string): Promise<CoreResult> {
  const draft = await ownedDraft(actor, draftId);
  if (!canTransition(draft.status, "SOLD")) {
    throw new AppError("CONFLICT", `No se puede marcar vendida desde ${draft.status}.`);
  }
  await db.listing.update({ where: { id: draft.id }, data: { status: "SOLD" } });
  return { ok: true, message: "Marcada como vendida. ¡Felicidades!" };
}

export async function archiveListing(actor: Actor, draftId: string): Promise<CoreResult> {
  const draft = await ownedDraft(actor, draftId);
  if (!canTransition(draft.status, "ARCHIVED")) {
    throw new AppError("CONFLICT", `No se puede archivar desde ${draft.status}.`);
  }
  await db.listing.update({ where: { id: draft.id }, data: { status: "ARCHIVED" } });
  return { ok: true, message: "Publicación archivada." };
}

export async function withdrawToDraft(actor: Actor, draftId: string): Promise<CoreResult> {
  const draft = await ownedDraft(actor, draftId);
  if (!canTransition(draft.status, "DRAFT")) {
    throw new AppError("CONFLICT", `No se puede retirar desde ${draft.status}.`);
  }
  await db.listing.update({ where: { id: draft.id }, data: { status: "DRAFT" } });
  return { ok: true, message: "De vuelta a borrador." };
}

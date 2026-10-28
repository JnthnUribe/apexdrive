"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireFreshUser } from "@/lib/authz";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { limitOrThrow } from "@/lib/ratelimit";
import type { Actor } from "./drafts";
import {
  addPhoto,
  archiveListing,
  createDraft,
  markSold,
  removePhoto,
  submitForReview,
  updateDraftStep,
  updatePrice,
  withdrawToDraft,
} from "./drafts";

export type ListingActionResult = { ok: boolean; message: string; draftId?: string };

function entries(formData: FormData): Record<string, string> {
  return Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
}

function toResult(err: unknown): ListingActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message };
  if (err instanceof ZodError) return { ok: false, message: err.issues[0]?.message ?? "Datos inválidos." };
  logger.error({ err }, "listings action: error inesperado");
  return { ok: false, message: "Ocurrió un error inesperado." };
}

async function actor(): Promise<Actor> {
  const user = await requireFreshUser();
  return { userId: user.id, role: user.role };
}

/** Anti-spam de escrituras por usuario (Fase 6). Clave por cuenta, no por IP. */
function mutateLimit(userId: string, scope: string, limit = 60): void {
  limitOrThrow(`listing:${scope}:${userId}`, limit, 60_000);
}

function refresh(): void {
  revalidatePath("/sell");
  revalidatePath("/dashboard/listings");
  revalidatePath("/cars");
}

/** Paso 1 del wizard: crea el borrador y devuelve su id. */
export async function createDraftAction(
  _prev: ListingActionResult | null,
  formData: FormData,
): Promise<ListingActionResult> {
  try {
    const who = await actor();
    mutateLimit(who.userId, "create", 30);
    const res = await createDraft(who, entries(formData));
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

/** Pasos 1–4 y 6 sobre borrador (draftId + step en campos ocultos). */
export async function updateStepAction(
  _prev: ListingActionResult | null,
  formData: FormData,
): Promise<ListingActionResult> {
  try {
    const data = entries(formData);
    const { draftId, step, ...fields } = data;
    if (!draftId || !step) throw new AppError("UNPROCESSABLE", "Falta identificar el borrador.");
    const who = await actor();
    mutateLimit(who.userId, "update");
    const res = await updateDraftStep(who, draftId, Number(step), fields);
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

export async function addPhotoAction(
  _prev: ListingActionResult | null,
  formData: FormData,
): Promise<ListingActionResult> {
  try {
    const data = entries(formData);
    if (!data["draftId"] || !data["url"]) throw new AppError("UNPROCESSABLE", "Falta la URL.");
    const who = await actor();
    mutateLimit(who.userId, "photo");
    const res = await addPhoto(who, data["draftId"] as string, data["url"] as string);
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

export async function deletePhotoAction(
  _prev: ListingActionResult | null,
  formData: FormData,
): Promise<ListingActionResult> {
  try {
    const data = entries(formData);
    if (!data["draftId"] || !data["photoId"]) throw new AppError("UNPROCESSABLE", "Falta identificar la foto.");
    const who = await actor();
    mutateLimit(who.userId, "photo");
    const res = await removePhoto(who, data["draftId"] as string, data["photoId"] as string);
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

export async function submitAction(
  _prev: ListingActionResult | null,
  formData: FormData,
): Promise<ListingActionResult> {
  try {
    const data = entries(formData);
    if (!data["draftId"]) throw new AppError("UNPROCESSABLE", "Falta identificar el borrador.");
    const who = await actor();
    mutateLimit(who.userId, "submit", 10);
    const res = await submitForReview(who, data["draftId"] as string);
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

export async function updatePriceAction(
  _prev: ListingActionResult | null,
  formData: FormData,
): Promise<ListingActionResult> {
  try {
    const data = entries(formData);
    if (!data["draftId"]) throw new AppError("UNPROCESSABLE", "Falta identificar la publicación.");
    const who = await actor();
    mutateLimit(who.userId, "price");
    const res = await updatePrice(who, data["draftId"] as string, { priceMXN: data["priceMXN"] });
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

/** Operaciones de estado (op=sold|archive|withdraw) sobre publicaciones propias. */
export async function manageAction(
  _prev: ListingActionResult | null,
  formData: FormData,
): Promise<ListingActionResult> {
  try {
    const data = entries(formData);
    const id = data["draftId"];
    if (!id) throw new AppError("UNPROCESSABLE", "Falta identificar la publicación.");
    const who = await actor();
    mutateLimit(who.userId, "manage");
    let res;
    switch (data["op"]) {
      case "sold":
        res = await markSold(who, id);
        break;
      case "archive":
        res = await archiveListing(who, id);
        break;
      case "withdraw":
        res = await withdrawToDraft(who, id);
        break;
      default:
        throw new AppError("UNPROCESSABLE", "Operación desconocida.");
    }
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireFreshUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { limitOrThrow } from "@/lib/ratelimit";
import { validateComparisonSlugs } from "./selection";

// Comparativas guardadas (Fase 5). Núcleo con userId explícito (testeable) +
// wrappers con sesión. Reglas: 2–4 slugs únicos, todos PUBLISHED; dueño o nada.

export async function saveComparisonCore(
  userId: string,
  name: string,
  rawSlugs: string[],
): Promise<{ id: string }> {
  const slugs = validateComparisonSlugs(rawSlugs);
  const cleanName = name.trim().slice(0, 60) || "Mi comparativa";
  const found = await db.listing.findMany({
    where: { slug: { in: slugs }, status: "PUBLISHED" },
    select: { id: true, slug: true },
  });
  if (found.length !== slugs.length) {
    throw new AppError("UNPROCESSABLE", "Algún vehículo ya no está publicado.");
  }
  const bySlug = new Map(found.map((f) => [f.slug, f.id]));
  const comparison = await db.comparison.create({
    data: {
      userId,
      name: cleanName,
      items: { create: slugs.map((s) => ({ listingId: bySlug.get(s) as string })) },
    },
    select: { id: true },
  });
  return { id: comparison.id };
}

export async function deleteComparisonCore(userId: string, id: string): Promise<void> {
  const res = await db.comparison.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new AppError("NOT_FOUND", "Comparativa no encontrada.");
}

export type SavedComparison = {
  id: string;
  name: string;
  createdAt: Date;
  items: Array<{ listing: { slug: string; title: string; priceMXN: number | null } }>;
};

export async function listMyComparisons(userId: string): Promise<SavedComparison[]> {
  return db.comparison.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      items: { select: { listing: { select: { slug: true, title: true, priceMXN: true } } } },
    },
  });
}

export type ComparisonActionResult = { ok: boolean; message: string; id?: string };

function toResult(err: unknown): ComparisonActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message };
  if (err instanceof ZodError) return { ok: false, message: "Datos inválidos." };
  logger.error({ err }, "compare action: error inesperado");
  return { ok: false, message: "Ocurrió un error inesperado." };
}

export async function saveComparisonAction(
  _prev: ComparisonActionResult | null,
  formData: FormData,
): Promise<ComparisonActionResult> {
  try {
    const user = await requireFreshUser();
    limitOrThrow(`compare:save:${user.id}`, 30, 60_000);
    const slugs = String(formData.get("slugs") ?? "").split(",");
    const res = await saveComparisonCore(user.id, String(formData.get("name") ?? ""), slugs);
    revalidatePath("/dashboard");
    return { ok: true, message: "Comparativa guardada en tu cuenta.", id: res.id };
  } catch (err) {
    return toResult(err);
  }
}

export async function deleteComparisonAction(
  _prev: ComparisonActionResult | null,
  formData: FormData,
): Promise<ComparisonActionResult> {
  try {
    const user = await requireFreshUser();
    const id = String(formData.get("id") ?? "");
    if (!id) throw new AppError("UNPROCESSABLE", "Falta identificar la comparativa.");
    await deleteComparisonCore(user.id, id);
    revalidatePath("/dashboard");
    return { ok: true, message: "Comparativa eliminada." };
  } catch (err) {
    return toResult(err);
  }
}

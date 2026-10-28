"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireFreshUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { limitOrThrow } from "@/lib/ratelimit";

// Favoritos. Endurecido Fase 6:
// - Rate limit por usuario (anti-spam de escrituras).
// - P2003 (listing inexistente) → 404 honesto, sin filtrar internals de Prisma.
// - P2002 (carrera doble-click) → se completa el toggle en vez de 500.

export async function toggleFavorite(listingId: string): Promise<{ favorited: boolean }> {
  const user = await requireFreshUser();
  limitOrThrow(`fav:${user.id}`, 60, 60_000);
  const existing = await db.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
    select: { id: true },
  });
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/dashboard");
    return { favorited: false };
  }
  try {
    await db.favorite.create({ data: { userId: user.id, listingId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new AppError("NOT_FOUND", "Vehículo no disponible.");
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await db.favorite.deleteMany({ where: { userId: user.id, listingId } });
      revalidatePath("/dashboard");
      return { favorited: false };
    }
    throw err;
  }
  revalidatePath("/dashboard");
  return { favorited: true };
}

export async function isFavorite(listingId: string): Promise<boolean> {
  const user = await requireFreshUser();
  const row = await db.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
    select: { id: true },
  });
  return row !== null;
}

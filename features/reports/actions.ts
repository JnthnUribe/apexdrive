"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireFreshUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { limitOrThrow } from "@/lib/ratelimit";

// Reportes de contenido. Solo sobre PUBLISHED (no se reportan borradores),
// un OPEN por usuario+listing, 5/hora por usuario. El detalle va a admin.

const reportSchema = z.object({
  listingId: z.string().min(1).max(64),
  reason: z.enum(["SPAM", "FRAUD", "WRONG_INFO", "DUPLICATE", "OTHER"]),
  detail: z.string().trim().max(500).optional(),
});

export type ReportActionResult = { ok: boolean; message: string };

export async function createReportAction(
  _prev: ReportActionResult | null,
  formData: FormData,
): Promise<ReportActionResult> {
  try {
    const user = await requireFreshUser();
    limitOrThrow(`report:${user.id}`, 5, 3_600_000);
    const data = reportSchema.parse({
      listingId: String(formData.get("listingId") ?? ""),
      reason: String(formData.get("reason") ?? ""),
      detail: String(formData.get("detail") ?? ""),
    });
    const listing = await db.listing.findUnique({
      where: { id: data.listingId },
      select: { id: true, status: true },
    });
    if (!listing || listing.status !== "PUBLISHED") {
      throw new AppError("NOT_FOUND", "Publicación no disponible para reportar.");
    }
    const dupe = await db.report.findFirst({
      where: { reporterId: user.id, listingId: listing.id, status: "OPEN" },
      select: { id: true },
    });
    if (dupe) {
      throw new AppError("CONFLICT", "Ya tienes un reporte abierto sobre esta publicación.");
    }
    try {
      await db.report.create({
        data: {
          reporterId: user.id,
          listingId: listing.id,
          reason: data.reason,
          detail: data.detail || null,
        },
      });
    } catch (err) {
      // Carrera doble-submit: el índice parcial 0005 rechaza el segundo.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppError("CONFLICT", "Ya tienes un reporte abierto sobre esta publicación.");
      }
      throw err;
    }
    return { ok: true, message: "Reporte enviado. El equipo lo revisará." };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, message: err.message };
    if (err instanceof z.ZodError) return { ok: false, message: "Datos inválidos." };
    logger.error({ err }, "report action: error inesperado");
    return { ok: false, message: "Ocurrió un error inesperado." };
  }
}

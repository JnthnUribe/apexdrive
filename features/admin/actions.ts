"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { limitOrThrow } from "@/lib/ratelimit";

// Moderación y administración. Núcleo con adminId explícito (testeable) +
// wrappers con requireAdmin. TODA acción escribe AdminAction (auditoría
// append-only). Reglas: aprobar/rechazar solo PENDING; ocultar solo PUBLISHED;
// nunca bloquearse a sí mismo ni a otros ADMIN.

export type AdminActionResult = { ok: boolean; message: string };
export type ModerationDecision = "approve" | "reject" | "hide";

function audit(adminId: string, targetType: string, targetId: string, action: string, reason?: string) {
  return db.adminAction.create({
    data: {
      adminId,
      targetType,
      targetId,
      action,
      reason: reason?.slice(0, 500) ?? null,
    },
  });
}

/** Defensa en profundidad: el núcleo también exige ADMIN activo, no solo el wrapper. */
async function assertAdmin(adminId: string): Promise<void> {
  const row = await db.user.findUnique({
    where: { id: adminId },
    select: { role: true, status: true },
  });
  if (!row || row.role !== "ADMIN" || row.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Se requiere rol administrador.");
  }
}

export async function moderateCore(
  adminId: string,
  listingId: string,
  decision: ModerationDecision,
  reason?: string,
): Promise<AdminActionResult> {
  await assertAdmin(adminId);
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, status: true },
  });
  if (!listing) throw new AppError("NOT_FOUND", "Publicación no encontrada.");
  let to: "PUBLISHED" | "REJECTED" | "ARCHIVED";
  if (decision === "approve") {
    if (listing.status !== "PENDING") {
      throw new AppError("CONFLICT", `Solo PENDING se aprueba (actual: ${listing.status}).`);
    }
    to = "PUBLISHED";
  } else if (decision === "reject") {
    if (listing.status !== "PENDING") {
      throw new AppError("CONFLICT", `Solo PENDING se rechaza (actual: ${listing.status}).`);
    }
    to = "REJECTED";
  } else {
    if (listing.status !== "PUBLISHED") {
      throw new AppError("CONFLICT", `Solo PUBLISHED se oculta (actual: ${listing.status}).`);
    }
    to = "ARCHIVED";
  }
  await db.$transaction([
    db.listing.update({
      where: { id: listing.id },
      data: { status: to, ...(decision === "approve" ? { publishedAt: new Date() } : {}) },
    }),
    audit(adminId, "listing", listing.id, decision, reason),
  ]);
  const messages = { approve: "Publicación aprobada y visible.", reject: "Publicación rechazada.", hide: "Publicación oculta." } as const;
  return { ok: true, message: messages[decision] };
}

export async function setUserStatusCore(
  adminId: string,
  userId: string,
  status: "ACTIVE" | "BLOCKED",
): Promise<AdminActionResult> {
  await assertAdmin(adminId);
  if (userId === adminId) {
    throw new AppError("CONFLICT", "No puedes cambiar tu propio estado.");
  }
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
  if (!target) throw new AppError("NOT_FOUND", "Usuario no encontrado.");
  if (target.role === "ADMIN") {
    throw new AppError("FORBIDDEN", "No se puede bloquear a otro administrador.");
  }
  if (target.status === status) {
    throw new AppError("CONFLICT", `El usuario ya está ${status === "ACTIVE" ? "activo" : "bloqueado"}.`);
  }
  await db.$transaction([
    db.user.update({
      where: { id: target.id },
      // Al bloquear se revocan JWTs vigentes (tokenVersion); al desbloquear no hace falta.
      data: status === "BLOCKED" ? { status, tokenVersion: { increment: 1 } } : { status },
    }),
    audit(adminId, "user", target.id, status === "BLOCKED" ? "block" : "unblock"),
  ]);
  return { ok: true, message: status === "BLOCKED" ? "Usuario bloqueado y sesiones revocadas." : "Usuario reactivado." };
}

export async function resolveReportCore(
  adminId: string,
  reportId: string,
  status: "RESOLVED" | "DISMISSED",
): Promise<AdminActionResult> {
  await assertAdmin(adminId);
  const report = await db.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true },
  });
  if (!report) throw new AppError("NOT_FOUND", "Reporte no encontrado.");
  if (report.status !== "OPEN") {
    throw new AppError("CONFLICT", `Reporte ya atendido (${report.status}).`);
  }
  await db.$transaction([
    db.report.update({ where: { id: report.id }, data: { status } }),
    audit(adminId, "report", report.id, status === "RESOLVED" ? "resolve" : "dismiss"),
  ]);
  return { ok: true, message: status === "RESOLVED" ? "Reporte resuelto." : "Reporte descartado." };
}

function toResult(err: unknown): AdminActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message };
  if (err instanceof ZodError) return { ok: false, message: "Datos inválidos." };
  logger.error({ err }, "admin action: error inesperado");
  return { ok: false, message: "Ocurrió un error inesperado." };
}

function entries(formData: FormData): Record<string, string> {
  return Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
}

async function adminId(): Promise<string> {
  const admin = await requireAdmin();
  limitOrThrow(`admin:${admin.id}`, 60, 60_000);
  return admin.id;
}

function refresh(): void {
  revalidatePath("/admin");
}

export async function moderateAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const data = entries(formData);
    if (!data["id"] || (data["decision"] !== "approve" && data["decision"] !== "reject" && data["decision"] !== "hide")) {
      throw new AppError("UNPROCESSABLE", "Decisión inválida.");
    }
    const res = await moderateCore(await adminId(), data["id"] as string, data["decision"], data["reason"]);
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

export async function userStatusAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const data = entries(formData);
    if (!data["id"] || (data["status"] !== "ACTIVE" && data["status"] !== "BLOCKED")) {
      throw new AppError("UNPROCESSABLE", "Estado inválido.");
    }
    const res = await setUserStatusCore(await adminId(), data["id"] as string, data["status"]);
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

export async function resolveReportAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const data = entries(formData);
    if (!data["id"] || (data["status"] !== "RESOLVED" && data["status"] !== "DISMISSED")) {
      throw new AppError("UNPROCESSABLE", "Resolución inválida.");
    }
    const res = await resolveReportCore(await adminId(), data["id"] as string, data["status"]);
    refresh();
    return res;
  } catch (err) {
    return toResult(err);
  }
}

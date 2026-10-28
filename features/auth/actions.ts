"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { signOut } from "@/lib/auth";
import { requireFreshUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashPassword } from "@/lib/password";
import { clientIp, consumeAuth } from "@/lib/ratelimit";
import { forgotSchema, profileSchema, registerSchema, resetSchema } from "./schema";

export type ActionResult = { ok: boolean; message: string; devPreview?: string };

const GENERIC_REGISTER_MSG =
  "Si el correo es nuevo, tu cuenta fue creada. Continúa al inicio de sesión.";
const GENERIC_FORGOT_MSG = "Si existe una cuenta con ese correo, enviamos instrucciones.";

function formEntries(formData: FormData): Record<string, string> {
  return Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
}

function toResult(err: unknown): ActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message };
  if (err instanceof ZodError) {
    return { ok: false, message: err.issues[0]?.message ?? "Datos inválidos." };
  }
  logger.error({ err }, "auth action: error inesperado");
  return { ok: false, message: "Ocurrió un error inesperado." };
}

async function checkRateLimit(scope: string): Promise<void> {
  const ip = await clientIp();
  // Bloqueo progresivo: 5/min → 15 min → 1 h ante denegaciones repetidas.
  const r = consumeAuth(`${scope}:${ip}`);
  if (!r.allowed) {
    throw new AppError("RATE_LIMITED", `Demasiados intentos. Reintenta en ${r.retryAfterSec} s.`);
  }
}

/** Registro. Rol siempre USER (ignora cualquier otro valor aunque se envíe). */
export async function registerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await checkRateLimit("register");
    const data = registerSchema.parse(formEntries(formData));
    const existing = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (!existing) {
      const passwordHash = await hashPassword(data.password);
      await db.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: "USER",
          profile: { create: { displayName: data.displayName } },
        },
      });
    }
    return { ok: true, message: GENERIC_REGISTER_MSG };
  } catch (err) {
    return toResult(err);
  }
}

/** Solicitud de recuperación. Idéntica respuesta exista o no la cuenta. */
export async function forgotAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await checkRateLimit("forgot");
    const { email } = forgotSchema.parse(formEntries(formData));
    const user = await db.user.findUnique({ where: { email }, select: { id: true, status: true } });
    if (user && user.status === "ACTIVE") {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db.$transaction([
        db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        db.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
        }),
      ]);
      const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
      const link = `${base}/reset-password?token=${token}`;
      const { delivered } = await sendPasswordResetEmail(email, link);
      if (!delivered && process.env["NODE_ENV"] !== "production") {
        return { ok: true, message: GENERIC_FORGOT_MSG, devPreview: link };
      }
    }
    return { ok: true, message: GENERIC_FORGOT_MSG };
  } catch (err) {
    return toResult(err);
  }
}

/** Consume el token (un solo uso), cambia el hash e invalida JWTs vigentes. */
export async function resetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await checkRateLimit("reset");
    const { token, password } = resetSchema.parse(formEntries(formData));
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError("UNPROCESSABLE", "Enlace inválido o expirado. Solicita uno nuevo.");
    }
    const passwordHash = await hashPassword(password);
    // Consumo atómico: solo una request marca el token (condición usedAt null).
    // La perdedora de una carrera recibe count 0 → error, token de un solo uso
    // garantizado a nivel DB (ver docs/SECURITY.md RACE-01).
    const [, tokenRes] = await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      db.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
    if (tokenRes.count === 0) {
      throw new AppError("UNPROCESSABLE", "Enlace ya utilizado. Solicita uno nuevo.");
    }
    return { ok: true, message: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." };
  } catch (err) {
    return toResult(err);
  }
}

/** Edita el perfil propio (ownership = id de sesión, nunca del formulario). */
export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireFreshUser();
    const data = profileSchema.parse(formEntries(formData));
    await db.profile.update({
      where: { userId: user.id },
      data: {
        displayName: data.displayName,
        phone: data.phone || null,
        city: data.city || null,
      },
    });
    revalidatePath("/dashboard");
    return { ok: true, message: "Perfil actualizado." };
  } catch (err) {
    return toResult(err);
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

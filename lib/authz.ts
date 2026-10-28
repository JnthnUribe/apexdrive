import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { resolveGuard, type SessionUser } from "@/lib/guards";

export { canAccessAdmin, canEditListing, canSell, resolveGuard } from "@/lib/guards";
export type { SessionUser } from "@/lib/guards";

// Helpers con sesión/DB. El rol NUNCA se acepta desde el cliente: parten de la
// sesión firmada y revalidan contra DB cuando importa (requireFreshUser).

/** Sesión firmada (rápida, del token). Para decisiones sensibles usar requireFreshUser. */
export async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || u.status !== "ACTIVE") {
    throw new AppError("UNAUTHORIZED", "Inicia sesión para continuar.");
  }
  return { id: u.id, role: u.role, status: u.status };
}

/** Fuente de verdad: revalida rol/estado contra DB. OBLIGATORIO en Server Actions. */
export async function requireFreshUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new AppError("UNAUTHORIZED", "Inicia sesión para continuar.");
  const row = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true, tokenVersion: true },
  });
  if (!row || row.status !== "ACTIVE") {
    throw new AppError("UNAUTHORIZED", "Sesión inválida. Inicia sesión de nuevo.");
  }
  if (row.tokenVersion !== session?.user?.tokenVersion) {
    throw new AppError("UNAUTHORIZED", "Sesión revocada. Inicia sesión de nuevo.");
  }
  return { id: row.id, role: row.role, status: row.status };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireFreshUser();
  if (user.role !== "ADMIN") throw new AppError("FORBIDDEN", "Se requiere rol administrador.");
  return user;
}

/** Guard para layouts de zona privada (redirige, no lanza). */
export async function guardLayout(pathname: string): Promise<SessionUser> {
  const session = await auth();
  const raw = session?.user;
  const user: SessionUser | null =
    raw?.id && raw.status === "ACTIVE" ? { id: raw.id, role: raw.role, status: raw.status } : null;
  const decision = resolveGuard(pathname, user);
  if (!("allow" in decision)) redirect(decision.redirect);
  return user as SessionUser;
}

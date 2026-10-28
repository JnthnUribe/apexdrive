import type { Role, UserStatus } from "@prisma/client";

// Decisiones de autorización PURAS (sin imports de runtime).
// Este módulo es seguro en Edge (proxy.ts), Node y Vitest.
// La fuente de verdad sigue siendo DB (requireFreshUser en lib/authz.ts);
// aquí solo vive la lógica de decisión, unit-testeable.

export type SessionUser = {
  id: string;
  role: Role;
  status: UserStatus;
};

export type GuardResult = { allow: true } | { redirect: string };

/** Routing guard: quién puede pisar cada zona. */
export function resolveGuard(pathname: string, user: SessionUser | null): GuardResult {
  if (!user || user.status !== "ACTIVE") {
    const next = encodeURIComponent(pathname);
    return { redirect: `/login?callbackUrl=${next}` };
  }
  if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
    return { redirect: "/forbidden" };
  }
  if (pathname.startsWith("/sell") && user.role !== "SELLER" && user.role !== "ADMIN") {
    return { redirect: "/forbidden" };
  }
  return { allow: true };
}

export function canAccessAdmin(user: SessionUser | null): boolean {
  return user?.status === "ACTIVE" && user.role === "ADMIN";
}

export function canSell(user: SessionUser | null): boolean {
  return user?.status === "ACTIVE" && (user.role === "SELLER" || user.role === "ADMIN");
}

/** Ownership: ADMIN o vendedor dueño. IDOR imposible si se usa en el WHERE. */
export function canEditListing(
  user: SessionUser | null,
  listing: { seller: { userId: string } } | null,
): boolean {
  if (!user || user.status !== "ACTIVE" || !listing) return false;
  if (user.role === "ADMIN") return true;
  return listing.seller.userId === user.id;
}

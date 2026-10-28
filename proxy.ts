import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { resolveGuard, type SessionUser } from "@/lib/guards";

// Proxy (ex-middleware, convención Next 16): authN en el borde + rol para
// /admin y /sell. Solo depende de módulos Edge-safe: verifica el JWT con
// getToken (jose), NUNCA toca DB ni pino aquí. Las Server Actions revalidan
// contra DB (requireFreshUser). Sin AUTH_SECRET no hay sesión verificable:
// se trata como no autenticado (fail-closed hacia /login).

const ROLES: readonly Role[] = ["USER", "SELLER", "ADMIN"];

export default async function proxy(req: NextRequest): Promise<Response | undefined> {
  let user: SessionUser | null = null;
  try {
    const token = await getToken({ req, secret: process.env["AUTH_SECRET"] });
    const role = token?.role;
    if (typeof token?.id === "string" && token.status === "ACTIVE" && typeof role === "string" && (ROLES as readonly string[]).includes(role)) {
      user = { id: token.id as string, role: role as Role, status: "ACTIVE" };
    }
  } catch {
    user = null;
  }
  const decision = resolveGuard(req.nextUrl.pathname, user);
  if (!("allow" in decision)) {
    return Response.redirect(new URL(decision.redirect, req.nextUrl.origin));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/sell/:path*", "/admin/:path*"],
};

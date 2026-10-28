import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { verifyCredentials } from "@/lib/credentials";
import { loginSchema } from "@/features/auth/schema";

// Sesiones JWT firmadas (revocables vía tokenVersion) + rol/estado revalidados
// contra DB en el proxy (rápido, del token) y en cada Server Action sensible
// (fuente de verdad, requireFreshUser). Detalle en docs y Fase 2.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
      tokenVersion: number;
    } & DefaultSession["user"];
  }
}

// Props propias del token. Sin augmentation de "next-auth/jwt": se castea
// en cada uso para no acoplar el build al layout interno de tipos de Auth.js.
type TokenExtras = {
  id?: unknown;
  role?: unknown;
  status?: unknown;
  tokenVersion?: unknown;
  refreshedAt?: unknown;
};

const REFRESH_MS = 5 * 60 * 1000;

// Verificación de credenciales en lib/credentials.ts (testeable sin HTTP;
// respuesta idéntica ante inexistente/bloqueado/sin-password/error → anti-enumeración).

async function loadSessionRow(id: string): Promise<{
  id: string;
  role: Role;
  status: UserStatus;
  tokenVersion: number;
} | null> {
  return db.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true, tokenVersion: true },
  });
}

const googleConfigured = Boolean(
  process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"],
);

/** Para la UI: Google se deshabilita con motivo si no hay credenciales (Fase 2, R-02). */
export const googleEnabled = googleConfigured;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    ...(googleConfigured ? [Google] : []),
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        return verifyCredentials(parsed.data.email, parsed.data.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const ext = token as TokenExtras;
      if (typeof user?.id === "string") {
        const row = await loadSessionRow(user.id);
        if (!row || row.status !== "ACTIVE") return null;
        return {
          ...token,
          id: row.id,
          role: row.role,
          status: row.status,
          tokenVersion: row.tokenVersion,
          refreshedAt: Date.now(),
        };
      }
      const refreshedAt = typeof ext.refreshedAt === "number" ? ext.refreshedAt : 0;
      if (typeof ext.id === "string" && Date.now() - refreshedAt > REFRESH_MS) {
        try {
          const row = await loadSessionRow(ext.id);
          if (!row || row.status !== "ACTIVE" || row.tokenVersion !== ext.tokenVersion) {
            return null;
          }
          return { ...token, role: row.role, status: row.status, refreshedAt: Date.now() };
        } catch (err) {
          logger.warn({ err }, "auth: no se pudo refrescar sesión, se conserva token");
          return token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const ext = token as TokenExtras;
      if (typeof ext.id === "string") {
        session.user.id = ext.id;
        session.user.role = ext.role === "ADMIN" || ext.role === "SELLER" ? ext.role : "USER";
        session.user.status = ext.status === "BLOCKED" ? "BLOCKED" : "ACTIVE";
        session.user.tokenVersion = typeof ext.tokenVersion === "number" ? ext.tokenVersion : 0;
      }
      return session;
    },
  },
});

import type { UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

// Verificación de credenciales separada del router Auth.js para poder
// unit-testearse con dependencias inyectadas (sin HTTP ni DB real).

export type CredentialChecker = {
  findUser: (email: string) => Promise<{
    id: string;
    passwordHash: string | null;
    status: UserStatus;
  } | null>;
  verify: (password: string, hash: string) => Promise<boolean>;
};

const liveChecker: CredentialChecker = {
  findUser: (email) =>
    db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, status: true },
    }),
  verify: verifyPassword,
};

/**
 * Respuesta idéntica (null) ante: inexistente, sin password (OAuth), bloqueado
 * o contraseña errónea → anti-enumeración.
 */
export async function verifyCredentials(
  email: string,
  password: string,
  deps: CredentialChecker = liveChecker,
): Promise<{ id: string } | null> {
  const user = await deps.findUser(email);
  if (!user?.passwordHash || user.status !== "ACTIVE") return null;
  const ok = await deps.verify(password, user.passwordHash);
  return ok ? { id: user.id } : null;
}

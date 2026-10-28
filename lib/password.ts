import bcrypt from "bcryptjs";

const ROUNDS = 12;

/** Hash con costo 12. Nunca loguear ni devolver el hash al cliente. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

/** Comparación en tiempo constante (bcrypt). */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

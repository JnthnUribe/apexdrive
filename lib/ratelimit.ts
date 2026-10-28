import { headers } from "next/headers";
import { AppError } from "./errors";

// Rate limiting por token bucket en memoria (instancia única).
// Válido para Fase 2 y despliegue single-instance. Migrar a Redis/Upstash
// cuando haya múltiples réplicas (Fase 9) — la interfaz `consume` no cambia.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export const SENSITIVE_LIMITS = {
  /** Login, registro, recuperación: 5 intentos/min por IP. */
  auth: { limit: 5, windowMs: 60_000 },
} as const;

export function consume(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSec: number } {
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) {
      if (now >= b.resetAt) buckets.delete(k);
    }
  }
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** Solo para tests: limpia el estado. */
export function __resetRateLimits(): void {
  buckets.clear();
  strikes.clear();
}

/** Límite simple que lanza 429 (para mutaciones autenticadas, clave por usuario). */
export function limitOrThrow(key: string, limit: number, windowMs: number, now = Date.now()): void {
  const r = consume(key, limit, windowMs, now);
  if (!r.allowed) {
    throw new AppError("RATE_LIMITED", `Demasiados intentos. Reintenta en ${r.retryAfterSec} s.`);
  }
}

// --- Bloqueo progresivo para auth (fuerza bruta): 5/min, luego 15 min, luego 1 h.
// Ventana de strikes: 1 h desde la última denegación.

const ESCALATION_WINDOWS = [60_000, 15 * 60_000, 60 * 60_000];
const STRIKE_TTL = 3_600_000;

type Strike = { denies: number; expiresAt: number };
const strikes = new Map<string, Strike>();

export function consumeAuth(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const strike = strikes.get(key);
  const active = strike && now < strike.expiresAt ? strike : null;
  if (!active && strike) strikes.delete(key);
  const level = active ? Math.min(active.denies, ESCALATION_WINDOWS.length - 1) : 0;
  const windowMs = ESCALATION_WINDOWS[level] ?? 60_000;
  const result = consume(`${key}:l${level}`, 5, windowMs, now);
  if (!result.allowed) {
    strikes.set(key, { denies: (active?.denies ?? 0) + 1, expiresAt: now + STRIKE_TTL });
  }
  return result;
}

/** IP del cliente tras proxies (primer valor de XFF). Fuera de request → "unknown". */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
  } catch {
    // Sin contexto de request (tests de integración directos): se limita global.
  }
  return "unknown";
}

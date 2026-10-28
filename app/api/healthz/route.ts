import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// Salud del sistema. Nunca expone secretos ni stacks.
// Sin DATABASE_URL responde 503 degradado (diseñado, no excepción).
// `auth` indica si hay secreto de sesión configurado (login imposible sin él).
export async function GET(): Promise<NextResponse> {
  const started = Date.now();
  let database: { connected: boolean; latencyMs?: number } = { connected: false };

  if (process.env["DATABASE_URL"]) {
    try {
      const probe = db.$queryRaw`SELECT 1`;
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("db-timeout")), 2000);
      });
      await Promise.race([probe, timeout]);
      database = { connected: true, latencyMs: Date.now() - started };
    } catch (err) {
      logger.warn({ err }, "healthz: base de datos no disponible");
    }
  }

  const degraded = !database.connected;
  return NextResponse.json(
    {
      status: degraded ? "degraded" : "ok",
      version: "0.1.0",
      time: new Date().toISOString(),
      database,
      auth: { secretConfigured: Boolean(process.env["AUTH_SECRET"]) },
    },
    { status: degraded ? 503 : 200 },
  );
}

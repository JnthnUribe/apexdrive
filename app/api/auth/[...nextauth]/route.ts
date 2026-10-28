import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { consumeAuth } from "@/lib/ratelimit";

// Rate limit al callback de credenciales (login por fuerza bruta).
// Solo ese path+POST se limita; el resto delega directo a Auth.js.

type AuthHandler = (req: Request) => Promise<Response>;

const getHandler = handlers.GET as unknown as AuthHandler;
const postHandler = handlers.POST as unknown as AuthHandler;

async function maybeLimited(req: Request, run: () => Promise<Response>): Promise<Response> {
  const url = new URL(req.url);
  const isCredentialsLogin = req.method === "POST" && url.pathname.includes("/credentials");
  if (!isCredentialsLogin) return run();
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || "unknown";
  // Bloqueo progresivo compartido con las actions (5/min → 15 min → 1 h).
  const r = consumeAuth(`login:${ip}`);
  if (!r.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Reintenta más tarde." },
      { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } },
    );
  }
  return run();
}

export function GET(req: Request): Promise<Response> {
  return maybeLimited(req, () => getHandler(req));
}

export function POST(req: Request): Promise<Response> {
  return maybeLimited(req, () => postHandler(req));
}

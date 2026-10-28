import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { __resetRateLimits, consumeAuth, limitOrThrow } from "@/lib/ratelimit";
import { safeJsonLd } from "@/lib/seo";
import { photoSchema, step4Schema } from "@/features/listings/schema";

describe("consumeAuth (bloqueo progresivo)", () => {
  it("5 intentos/min, luego escala a 15 min y 1 h", () => {
    __resetRateLimits();
    const t0 = Date.now();
    for (let i = 0; i < 5; i++) expect(consumeAuth("atk", t0).allowed).toBe(true);
    expect(consumeAuth("atk", t0).allowed).toBe(false);
    // Nivel 1: bucket nuevo de 15 min → 5 intentos más y luego niega.
    for (let i = 0; i < 5; i++) expect(consumeAuth("atk", t0 + 1000).allowed).toBe(true);
    const denied = consumeAuth("atk", t0 + 1000);
    expect(denied.allowed).toBe(false);
    // Nivel 2: ventana de 1 h → Retry-After grande.
    for (let i = 0; i < 5; i++) consumeAuth("atk", t0 + 2000);
    const last = consumeAuth("atk", t0 + 2000);
    expect(last.allowed).toBe(false);
    expect(last.retryAfterSec).toBeGreaterThan(900);
    // Tras TTL de strikes (1 h) el nivel se resetea.
    expect(consumeAuth("atk", t0 + 3_700_000).allowed).toBe(true);
  });
});

describe("limitOrThrow", () => {
  it("lanza AppError 429 con mensaje seguro", () => {
    __resetRateLimits();
    limitOrThrow("m", 1, 60_000);
    try {
      limitOrThrow("m", 1, 60_000);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(429);
    }
  });
});

describe("safeJsonLd (XSS-01)", () => {
  it("neutraliza ruptura de </script> sin perder datos", () => {
    const evil = { name: '</script><script>alert("x")</script>' };
    const out = safeJsonLd(evil);
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual(evil);
  });
});

describe("inputs enormes", () => {
  it("descripción, features y URL se rechazan por tamaño", () => {
    expect(() =>
      step4Schema.parse({ city: "X".repeat(81), description: "Y".repeat(60) }),
    ).toThrow();
    expect(() =>
      step4Schema.parse({ city: "Mérida", description: "Y".repeat(5000) }),
    ).toThrow();
    expect(() =>
      photoSchema.parse({ url: `https://a.com/${"f".repeat(600)}.jpg` }),
    ).toThrow();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimits, consume } from "@/lib/ratelimit";

describe("consume (token bucket)", () => {
  beforeEach(() => __resetRateLimits());

  it("permite N y luego niega con Retry-After", () => {
    for (let i = 0; i < 5; i++) {
      expect(consume("k", 5, 60_000).allowed).toBe(true);
    }
    const denied = consume("k", 5, 60_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBeGreaterThan(0);
  });

  it("la ventana se renueva con el tiempo", () => {
    const t0 = Date.now();
    expect(consume("k", 1, 1000, t0).allowed).toBe(true);
    expect(consume("k", 1, 1000, t0 + 500).allowed).toBe(false);
    expect(consume("k", 1, 1000, t0 + 1001).allowed).toBe(true);
  });

  it("claves distintas son independientes", () => {
    expect(consume("a", 1, 60_000).allowed).toBe(true);
    expect(consume("a", 1, 60_000).allowed).toBe(false);
    expect(consume("b", 1, 60_000).allowed).toBe(true);
  });
});

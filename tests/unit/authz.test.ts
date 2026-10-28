import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canEditListing,
  canSell,
  resolveGuard,
  type SessionUser,
} from "@/lib/guards";

const USER: SessionUser = { id: "u1", role: "USER", status: "ACTIVE" };
const SELLER: SessionUser = { id: "s1", role: "SELLER", status: "ACTIVE" };
const ADMIN: SessionUser = { id: "a1", role: "ADMIN", status: "ACTIVE" };
const BLOCKED: SessionUser = { id: "b1", role: "USER", status: "BLOCKED" };

describe("resolveGuard (routing)", () => {
  it("no autenticado → /dashboard redirige a /login con callback", () => {
    expect(resolveGuard("/dashboard", null)).toEqual({
      redirect: "/login?callbackUrl=%2Fdashboard",
    });
  });

  it("USER → /admin redirige a /forbidden", () => {
    expect(resolveGuard("/admin/users", USER)).toEqual({ redirect: "/forbidden" });
  });

  it("ADMIN → /admin permitido", () => {
    expect(resolveGuard("/admin/users", ADMIN)).toEqual({ allow: true });
  });

  it("USER → /sell denegado; SELLER permitido", () => {
    expect(resolveGuard("/sell", USER)).toEqual({ redirect: "/forbidden" });
    expect(resolveGuard("/sell", SELLER)).toEqual({ allow: true });
  });

  it("bloqueado se trata como no autenticado", () => {
    expect(resolveGuard("/dashboard", BLOCKED)).toEqual({
      redirect: "/login?callbackUrl=%2Fdashboard",
    });
  });
});

describe("canAccessAdmin", () => {
  it.each([
    [USER, false],
    [SELLER, false],
    [ADMIN, true],
    [BLOCKED, false],
    [null, false],
  ])("rol=%s → %s", (user, expected) => {
    expect(canAccessAdmin(user)).toBe(expected);
  });
});

describe("canSell", () => {
  it("solo SELLER/ADMIN activos", () => {
    expect(canSell(USER)).toBe(false);
    expect(canSell(SELLER)).toBe(true);
    expect(canSell(ADMIN)).toBe(true);
    expect(canSell({ ...SELLER, status: "BLOCKED" })).toBe(false);
  });
});

describe("canEditListing (IDOR)", () => {
  const mine = { seller: { userId: "s1" } };
  const theirs = { seller: { userId: "s2" } };

  it("dueño edita lo suyo, no lo ajeno", () => {
    expect(canEditListing(SELLER, mine)).toBe(true);
    expect(canEditListing(SELLER, theirs)).toBe(false);
  });

  it("ADMIN edita cualquiera; anon/bloqueado/nulo nada", () => {
    expect(canEditListing(ADMIN, theirs)).toBe(true);
    expect(canEditListing(null, mine)).toBe(false);
    expect(canEditListing(BLOCKED, mine)).toBe(false);
    expect(canEditListing(SELLER, null)).toBe(false);
  });
});

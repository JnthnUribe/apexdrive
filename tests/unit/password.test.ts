import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password (bcrypt 12)", () => {
  it("hash y verifica", async () => {
    const hash = await hashPassword("ContrasenaSegura123");
    expect(hash).not.toContain("ContrasenaSegura123");
    expect(await verifyPassword("ContrasenaSegura123", hash)).toBe(true);
    expect(await verifyPassword("otra-clave-123", hash)).toBe(false);
  });

  it("entradas vacías nunca validan", async () => {
    expect(await verifyPassword("", "cualquier-hash")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});

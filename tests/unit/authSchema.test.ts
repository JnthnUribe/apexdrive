import { describe, expect, it } from "vitest";
import { forgotSchema, loginSchema, profileSchema, registerSchema } from "@/features/auth/schema";

describe("auth schemas (inputs inválidos)", () => {
  it("registro válido normaliza email", () => {
    const parsed = registerSchema.parse({
      email: "  Usuario@Example.MX ",
      password: "claveSegura123",
      displayName: "Ana",
    });
    expect(parsed.email).toBe("usuario@example.mx");
  });

  it("registro rechaza: corta, sin número, email malo, nombre corto", () => {
    expect(() => registerSchema.parse({ email: "a@x.mx", password: "corta123456", displayName: "A" })).toThrow();
    expect(() => registerSchema.parse({ email: "a@x.mx", password: "sinnumerosxxxx", displayName: "Ana" })).toThrow();
    expect(() => registerSchema.parse({ email: "no-email", password: "claveSegura123", displayName: "Ana" })).toThrow();
    expect(() => registerSchema.parse({ email: "a@x.mx", password: "x".repeat(73), displayName: "Ana" })).toThrow();
  });

  it("registro IGNORA rol aunque se envíe (claves desconocidas se descartan)", () => {
    const parsed = registerSchema.parse({
      email: "a@x.mx",
      password: "claveSegura123",
      displayName: "Ana",
      role: "ADMIN",
    });
    expect(parsed).not.toHaveProperty("role");
  });

  it("login no filtra política: acepta cualquier password no vacía", () => {
    expect(loginSchema.safeParse({ email: "a@x.mx", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@x.mx", password: "" }).success).toBe(false);
  });

  it("forgot exige email válido; perfil valida teléfono", () => {
    expect(forgotSchema.safeParse({ email: "mal" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Ana", phone: "abc!!!" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Ana", phone: "+52 999 123 4567" }).success).toBe(true);
  });
});

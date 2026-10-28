import { describe, expect, it } from "vitest";
import { AppError, fromUnknown } from "@/lib/errors";

describe("AppError", () => {
  it("expone código HTTP y requestId", () => {
    const err = new AppError("FORBIDDEN", "Sin permiso.");
    expect(err.status).toBe(403);
    expect(err.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("toPublic nunca incluye la causa interna", () => {
    const err = new AppError("INTERNAL", "Error.", { cause: { sql: "SELECT * FROM users" } });
    const pub = err.toPublic();
    expect(JSON.stringify(pub)).not.toContain("SELECT");
    expect(pub.error.code).toBe("INTERNAL");
  });

  it("fromUnknown conserva AppError y envuelve lo demás", () => {
    const original = new AppError("NOT_FOUND", "No existe.");
    expect(fromUnknown(original)).toBe(original);
    const wrapped = fromUnknown(new Error("boom"));
    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.code).toBe("INTERNAL");
    expect(wrapped.message).toBe("Ocurrió un error inesperado.");
  });
});

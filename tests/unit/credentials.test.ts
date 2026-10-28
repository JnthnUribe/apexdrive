import { describe, expect, it } from "vitest";
import { verifyCredentials, type CredentialChecker } from "@/lib/credentials";

const stub =
  (user: { id: string; passwordHash: string | null; status: "ACTIVE" | "BLOCKED" } | null): CredentialChecker => ({
    findUser: async () => user,
    verify: async (password, hash) => password === `ok:${hash}`,
  });

describe("verifyCredentials (anti-enumeración)", () => {
  it("credenciales válidas devuelven id", async () => {
    const res = await verifyCredentials("a@x.mx", "ok:h1", stub({ id: "u1", passwordHash: "h1", status: "ACTIVE" }));
    expect(res).toEqual({ id: "u1" });
  });

  it.each(["inexistente", "bloqueado", "sin-hash", "password-mal"])(
    "caso %s → null idéntico",
    async (caso) => {
      const user =
        caso === "inexistente"
          ? null
          : caso === "bloqueado"
            ? { id: "u1", passwordHash: "h1", status: "BLOCKED" as const }
            : caso === "sin-hash"
              ? { id: "u1", passwordHash: null, status: "ACTIVE" as const }
              : { id: "u1", passwordHash: "h1", status: "ACTIVE" as const };
      const password = caso === "password-mal" ? "mal" : "ok:h1";
      expect(await verifyCredentials("a@x.mx", password, stub(user))).toBeNull();
    },
  );
});

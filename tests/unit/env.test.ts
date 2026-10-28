import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const BASE = { DATABASE_URL: "postgresql://apex:apex@localhost:5432/apexdrive" };

describe("parseEnv", () => {
  it("acepta solo DATABASE_URL y aplica defaults", () => {
    const { server, client } = parseEnv(BASE);
    expect(server.DATABASE_URL).toContain("apexdrive");
    expect(server.NODE_ENV).toBe("development");
    expect(client.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("rechaza env sin DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow();
  });

  it("rechaza URL pública inválida", () => {
    expect(() => parseEnv({ ...BASE, NEXT_PUBLIC_APP_URL: "no-es-url" })).toThrow();
  });
});

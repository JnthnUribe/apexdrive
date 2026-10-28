import { describe, expect, it } from "vitest";
import { formatMXN, slugify } from "@/lib/format";

describe("formatMXN", () => {
  it("formatea sin decimales en es-MX", () => {
    expect(formatMXN(499000)).toBe("$499,000");
    expect(formatMXN(1149000)).toBe("$1,149,000");
  });

  it("redondea decimales", () => {
    expect(formatMXN(100.6)).toBe("$101");
  });

  it("rechaza valores no numéricos", () => {
    expect(() => formatMXN(NaN)).toThrow(RangeError);
  });
});

describe("slugify", () => {
  it("normaliza acentos y espacios", () => {
    expect(slugify("BMW M4 Competition")).toBe("bmw-m4-competition");
    expect(slugify("Mérida, Yucatán")).toBe("merida-yucatan");
  });
});

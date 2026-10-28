import { describe, expect, it } from "vitest";
import { buildVehicleWhere, catalogFilterSchema, SORT_ORDER } from "@/features/vehicles/catalogFilters";

describe("catalogFilterSchema", () => {
  it("convierte query strings a números", () => {
    const parsed = catalogFilterSchema.parse({ minPrice: "300000", maxYear: "2024" });
    expect(parsed.minPrice).toBe(300000);
    expect(parsed.maxYear).toBe(2024);
  });

  it("rechaza rangos absurdos", () => {
    expect(() => catalogFilterSchema.parse({ minYear: "1800" })).toThrow();
    expect(() => catalogFilterSchema.parse({ minPrice: "-5" })).toThrow();
  });
});

describe("buildVehicleWhere", () => {
  it("siempre filtra solo publicados", () => {
    expect(buildVehicleWhere({})).toEqual({ AND: [{ status: "PUBLISHED" }] });
  });

  it("búsqueda por texto cubre título, marca y modelo", () => {
    const where = buildVehicleWhere({ q: "mustang" });
    const or = (where.AND as unknown[])[1] as { OR: unknown[] };
    expect(or.OR).toHaveLength(3);
  });

  it("marca se normaliza a slug y precio/año a rangos", () => {
    const where = buildVehicleWhere({
      brand: "BMW",
      minPrice: 300000,
      maxPrice: 800000,
      minYear: 2020,
    });
    expect(JSON.stringify(where)).toContain('"slug":"bmw"');
    expect(JSON.stringify(where)).toContain('"gte":300000');
    expect(JSON.stringify(where)).toContain('"gte":2020');
  });
});

describe("SORT_ORDER", () => {
  it("cubre las 6 claves de orden sin campos inexistentes", () => {
    expect(Object.keys(SORT_ORDER)).toEqual([
      "featured",
      "price-asc",
      "price-desc",
      "newest",
      "mileage-asc",
      "year-desc",
    ]);
  });
});

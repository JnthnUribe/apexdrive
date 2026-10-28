import { describe, expect, it } from "vitest";
import {
  buildOrderBy,
  buildVehicleWhere,
  pageCount,
  parseCatalogQuery,
} from "@/features/vehicles/catalogFilters";

describe("parseCatalogQuery", () => {
  it("normaliza arrays a primer valor y aplica defaults", () => {
    const q = parseCatalogQuery({ brand: ["bmw", "audi"], sort: undefined, page: undefined });
    expect(q.brand).toBe("bmw");
    expect(q.sort).toBe("featured");
    expect(q.page).toBe(1);
  });

  it("sort inválido y page inválida caen a defaults (sin throw)", () => {
    const q = parseCatalogQuery({ sort: "hacker", page: "-3" });
    expect(q.sort).toBe("featured");
    expect(q.page).toBe(1);
  });

  it("ejemplo del spec: brand+body+minYear+maxPrice", () => {
    const q = parseCatalogQuery({ brand: "BMW", body: "SUV", minYear: "2020", maxPrice: "900000" });
    expect(q).toMatchObject({ brand: "BMW", body: "SUV", minYear: 2020, maxPrice: 900000 });
  });

  it("página absurda cae a default seguro (tope anti-offset gigante)", () => {
    expect(parseCatalogQuery({ page: "99999" }).page).toBe(1);
    expect(parseCatalogQuery({ page: "3" }).page).toBe(3);
  });
});

describe("buildVehicleWhere (combinados)", () => {
  it("combina model+fuel+body+condition+city+mileage+color", () => {
    const where = buildVehicleWhere({
      model: "X3",
      fuel: "DIESEL",
      body: "SUV",
      condition: "USED",
      city: "Mérida",
      maxMileage: 50000,
      color: "Negro",
    });
    const text = JSON.stringify(where);
    expect(text).toContain('"slug":"x3"');
    expect(text).toContain('"fuel":"DIESEL"');
    expect(text).toContain('"bodyType":"SUV"');
    expect(text).toContain('"condition":"USED"');
    expect(text).toContain('"lte":50000');
    expect(text).toContain("Negro");
    expect(text).toContain("Mérida");
  });

  it("rechaza enums inválidos en parsing", () => {
    expect(() => parseCatalogQuery({ fuel: "AGUA" })).toThrow();
  });
});

describe("buildOrderBy", () => {
  it("siempre agrega desempate por id", () => {
    expect(buildOrderBy("price-asc")).toEqual([{ priceMXN: "asc" }, { id: "asc" }]);
  });
});

describe("pageCount", () => {
  it("bordes: 0 → 1 página; 13 con size 12 → 2", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(12)).toBe(1);
    expect(pageCount(13)).toBe(2);
  });
});

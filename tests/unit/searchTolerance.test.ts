import { describe, expect, it } from "vitest";
import { buildVehicleWhere, searchTerms } from "@/features/vehicles/catalogFilters";

describe("searchTerms (tolerante a orden y caso)", () => {
  it("BMW M3 = bmw m3 = M3 BMW", () => {
    expect(searchTerms("BMW M3")).toEqual(["bmw", "m3"]);
    expect(searchTerms("bmw m3")).toEqual(["bmw", "m3"]);
    expect(searchTerms("M3 BMW")).toEqual(["m3", "bmw"]);
  });

  it("filtra ruido de 1 letra y topa en 5 términos", () => {
    expect(searchTerms("a b cde")).toEqual(["cde"]);
    expect(searchTerms("  BMW   M3  ")).toEqual(["bmw", "m3"]);
    expect(searchTerms("t1 t2 t3 t4 t5 t6")).toHaveLength(5);
  });
});

describe("buildVehicleWhere con q multitérmino", () => {
  it("cada término exige match (AND de ORs)", () => {
    const where = buildVehicleWhere({ q: "M3 BMW" });
    const and = (where as { AND: unknown[] }).AND;
    // status + 2 términos
    expect(and).toHaveLength(3);
    const text = JSON.stringify(and);
    expect(text).toContain("m3");
    expect(text).toContain("bmw");
  });

  it("q solo-ruido no agrega condiciones", () => {
    expect(buildVehicleWhere({ q: "a" })).toEqual({ AND: [{ status: "PUBLISHED" }] });
  });
});

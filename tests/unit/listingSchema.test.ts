import { describe, expect, it } from "vitest";
import {
  assertPublishable,
  parseFeatures,
  photoSchema,
  step1Schema,
  step2Schema,
  step4Schema,
  step6Schema,
  validateFeatures,
} from "@/features/listings/schema";

describe("listing schemas por paso", () => {
  it("rechaza año absurdo, km negativo, precio fuera de rango", () => {
    expect(() => step1Schema.parse({ brandSlug: "bmw", modelSlug: "x3", year: 1800, condition: "USED" })).toThrow();
    expect(() => step2Schema.parse({ mileageKm: -5, fuel: "PETROL", transmission: "MANUAL", bodyType: "SEDAN" })).toThrow();
    expect(() => step6Schema.parse({ priceMXN: 1000 })).toThrow();
    expect(() => step4Schema.parse({ city: "X", description: "corta" })).toThrow();
  });

  it("fotos: solo https con extensión válida", () => {
    expect(photoSchema.safeParse({ url: "https://a.com/f.jpg" }).success).toBe(true);
    expect(photoSchema.safeParse({ url: "http://a.com/f.jpg" }).success).toBe(false);
    expect(photoSchema.safeParse({ url: "https://a.com/f.exe" }).success).toBe(false);
  });

  it("parseFeatures limpia viñetas y vacías; validateFeatures acota", () => {
    expect(parseFeatures("- Clima\n\n• Cámara\n  \nPantalla")).toEqual(["Clima", "Cámara", "Pantalla"]);
    expect(validateFeatures(Array.from({ length: 21 }, (_, i) => `F${i}x`))).toContain("Máximo 20");
    expect(validateFeatures(["x"])).toContain("2–60");
    expect(validateFeatures(["Clima"])).toBeNull();
  });
});

describe("assertPublishable (gate)", () => {
  const full = {
    brandId: "b",
    carModelId: "m",
    year: 2020,
    condition: "USED",
    mileageKm: 10000,
    fuel: "PETROL",
    transmission: "MANUAL",
    bodyType: "SEDAN",
    city: "Mérida",
    description: "Descripción suficientemente larga para pasar el gate de publicación.",
    priceMXN: 200000,
    photoCount: 2,
  };

  it("completo → sin faltantes", () => {
    expect(assertPublishable(full)).toEqual([]);
  });

  it("incompleto → enumera todo lo faltante", () => {
    const missing = assertPublishable({ ...full, city: null, priceMXN: null, photoCount: 0, description: "corta" });
    expect(missing.length).toBeGreaterThanOrEqual(4);
    expect(missing.join(" ")).toContain("paso 4");
    expect(missing.join(" ")).toContain("paso 5");
    expect(missing.join(" ")).toContain("paso 6");
  });
});

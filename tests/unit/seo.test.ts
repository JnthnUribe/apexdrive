import { describe, expect, it } from "vitest";
import { buildBreadcrumbs, buildCatalogMetadata } from "@/lib/seo";

describe("buildCatalogMetadata", () => {
  it("base sin filtros indexa con canonical", () => {
    const m = buildCatalogMetadata({}, "https://apexdrive.mx");
    expect(m.title).toContain("Catálogo");
    expect(m.canonical).toBe("https://apexdrive.mx/cars");
    expect(m.noindex).toBe(false);
  });

  it("facetas con marca/ciudad y página>1 o q → noindex", () => {
    const paged = buildCatalogMetadata({ brand: "bmw", page: 2 }, "https://b.mx");
    expect(paged.title).toContain("bmw");
    expect(paged.noindex).toBe(true);
    const queried = buildCatalogMetadata({ q: "m3" }, "https://b.mx");
    expect(queried.noindex).toBe(true);
    const filtered = buildCatalogMetadata({ brand: "bmw", city: "Mérida" }, "https://b.mx");
    expect(filtered.noindex).toBe(false);
    expect(filtered.description).toContain("mérida");
  });
});

describe("buildBreadcrumbs", () => {
  it("emite BreadcrumbList con posiciones", () => {
    const json = buildBreadcrumbs("https://b.mx", [
      { name: "Inicio", path: "/" },
      { name: "Auto" },
    ]);
    const items = json["itemListElement"] as Array<Record<string, unknown>>;
    expect(json["@type"]).toBe("BreadcrumbList");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ position: 1, item: "https://b.mx/" });
    expect(items[1]).not.toHaveProperty("item");
  });
});

import { describe, expect, it } from "vitest";
import { rankRelated, scoreRelated, type RelatedCandidate } from "@/features/vehicles/related";

const target = {
  id: "t",
  brandId: "bmw",
  bodyType: "SUV",
  fuel: "PETROL",
  priceMXN: 500000,
  year: 2022,
};

const cand = (over: Partial<RelatedCandidate> & { id: string }): RelatedCandidate => ({
  brandId: "otra",
  bodyType: "SEDAN",
  fuel: "DIESEL",
  priceMXN: 500000,
  year: 2022,
  publishedAt: new Date("2024-01-01"),
  ...over,
});

describe("scoreRelated (explicable)", () => {
  it("suma marca 30 + carrocería 25 + precio 20 + año 15 + combustible 10", () => {
    expect(scoreRelated(target, cand({ id: "x", brandId: "bmw", bodyType: "SUV", fuel: "PETROL" }))).toBe(100);
  });

  it("precio fuera de ±20% no suma; año fuera de ±3 no suma", () => {
    expect(scoreRelated(target, cand({ id: "x", priceMXN: 900000, year: 2010 }))).toBe(0);
    expect(scoreRelated(target, cand({ id: "x", priceMXN: 550000, year: 2024 }))).toBe(35);
  });
});

describe("rankRelated", () => {
  it("ordena por puntaje, excluye al actual y desempata por recencia", () => {
    const list = rankRelated(
      target,
      [
        cand({ id: "low", publishedAt: new Date("2024-06-01") }),
        cand({ id: "top", brandId: "bmw", bodyType: "SUV", publishedAt: new Date("2024-01-01") }),
        cand({ id: "t" }),
      ],
      10,
    );
    expect(list.map((c) => c.id)).toEqual(["top", "low"]);
  });

  it("respeta el tope", () => {
    const many = Array.from({ length: 10 }, (_, i) => cand({ id: `c${i}` }));
    expect(rankRelated(target, many, 4)).toHaveLength(4);
  });
});

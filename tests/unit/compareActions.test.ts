import { describe, expect, it } from "vitest";
import { validateComparisonSlugs } from "@/features/compare/selection";

describe("validateComparisonSlugs (puro vía core)", () => {
  it("2–4 únicos pasan; resto falla con mensaje seguro", () => {
    expect(validateComparisonSlugs(["a", "b"])).toEqual(["a", "b"]);
    expect(validateComparisonSlugs(["a", "a", "b"])).toEqual(["a", "b"]);
    expect(() => validateComparisonSlugs(["solo"])).toThrow(/al menos 2/);
    expect(() => validateComparisonSlugs(["a", "b", "c", "d", "e"])).toThrow(/Máximo 4/);
    expect(() => validateComparisonSlugs(["", " "])).toThrow(/al menos 2/);
  });
});

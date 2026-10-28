import { describe, expect, it } from "vitest";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  compareUrl,
  parseCompareSlugs,
  toggleCompareSlugs,
} from "@/features/compare/selection";

describe("compare selection", () => {
  it("parsea a/b/c/d ignorando vacíos", () => {
    expect(parseCompareSlugs({ a: "x", b: "y" })).toEqual(["x", "y"]);
    expect(parseCompareSlugs({})).toEqual([]);
  });

  it("alterna y respeta el máximo de 4", () => {
    expect(toggleCompareSlugs(["a"], "b")).toEqual({ list: ["a", "b"], added: true });
    expect(toggleCompareSlugs(["a", "b"], "a")).toEqual({ list: ["b"], added: false });
    const full = ["a", "b", "c", "d"];
    expect(toggleCompareSlugs(full, "e")).toEqual({ list: full, added: false });
    expect(COMPARE_MIN).toBe(2);
    expect(COMPARE_MAX).toBe(4);
  });

  it("construye URL compartible", () => {
    expect(compareUrl(["x", "y"])).toBe("/compare?a=x&b=y");
  });
});

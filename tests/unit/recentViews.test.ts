import { describe, expect, it } from "vitest";
import {
  RECENT_MAX,
  addRecent,
  clearRecent,
  readRecent,
  writeRecent,
  type RecentView,
} from "@/features/history/recentViews";

function memStore(initial?: string): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_k, v) => {
      value = String(v);
    },
    removeItem: () => {
      value = null;
    },
  };
}

const view = (slug: string): Omit<RecentView, "at"> => ({ slug, title: `T ${slug}`, brand: "B" });

describe("recentViews (puro, sin window)", () => {
  it("agrega al frente sin duplicados y topa en 10", () => {
    let list: RecentView[] = [];
    list = addRecent(list, view("a"));
    list = addRecent(list, view("b"));
    list = addRecent(list, view("a"));
    expect(list.map((v) => v.slug)).toEqual(["a", "b"]);
    for (let i = 0; i < 15; i++) list = addRecent(list, view(`x${i}`));
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0]?.slug).toBe("x14");
  });

  it("storage corrupto → lista vacía; roundtrip válido", () => {
    expect(readRecent(memStore("no-json{{{"))).toEqual([]);
    expect(readRecent(memStore("[1,2]"))).toEqual([]);
    const store = memStore();
    writeRecent(store, addRecent([], view("a")));
    expect(readRecent(store).map((v) => v.slug)).toEqual(["a"]);
    clearRecent(store);
    expect(readRecent(store)).toEqual([]);
  });
});

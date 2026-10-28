import { describe, expect, it } from "vitest";
import type { ListingStatus } from "@prisma/client";
import { STEP_NAMES, canTransition, editableSteps } from "@/features/listings/transitions";

const ALL: ListingStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "SOLD", "REJECTED", "ARCHIVED"];

describe("canTransition (máquina de estados)", () => {
  it("permite solo las transiciones del vendedor", () => {
    expect(canTransition("DRAFT", "PENDING")).toBe(true);
    expect(canTransition("DRAFT", "ARCHIVED")).toBe(true);
    expect(canTransition("PENDING", "DRAFT")).toBe(true);
    expect(canTransition("PUBLISHED", "SOLD")).toBe(true);
    expect(canTransition("REJECTED", "PENDING")).toBe(true);
  });

  it("NUNCA auto-publica: DRAFT/PENDING → PUBLISHED prohibido para el flujo owner", () => {
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(false);
    expect(canTransition("PENDING", "PUBLISHED")).toBe(false);
    expect(canTransition("REJECTED", "PUBLISHED")).toBe(false);
  });

  it("ARCHIVED es terminal y PUBLISHED no vuelve a borrador", () => {
    for (const to of ALL) expect(canTransition("ARCHIVED", to)).toBe(false);
    expect(canTransition("PUBLISHED", "DRAFT")).toBe(false);
    expect(canTransition("SOLD", "DRAFT")).toBe(false);
  });
});

describe("editableSteps", () => {
  it("borrador/rechazado editan 1–6; publicado solo precio; resto nada", () => {
    expect(editableSteps("DRAFT")).toEqual([1, 2, 3, 4, 5, 6]);
    expect(editableSteps("REJECTED")).toEqual([1, 2, 3, 4, 5, 6]);
    expect(editableSteps("PUBLISHED")).toEqual([6]);
    expect(editableSteps("PENDING")).toEqual([]);
    expect(editableSteps("SOLD")).toEqual([]);
    expect(editableSteps("ARCHIVED")).toEqual([]);
  });

  it("wizard tiene 8 pasos nombrados", () => {
    expect(Object.keys(STEP_NAMES)).toHaveLength(8);
  });
});

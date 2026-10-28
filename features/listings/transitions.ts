import type { ListingStatus } from "@prisma/client";

// Máquina de estados de publicación. Transiciones de VENDEDOR (owner):
// - submit/resubmit: DRAFT|REJECTED → PENDING (jamás directo a PUBLISHED)
// - withdraw: PENDING → DRAFT · price: PUBLISHED (solo precio) · sold, archive.
// Aprobar/rechazar (→PUBLISHED|REJECTED) es ADMIN y llega en Fase 7.

const TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  DRAFT: ["PENDING", "ARCHIVED"],
  PENDING: ["DRAFT", "ARCHIVED"],
  PUBLISHED: ["SOLD", "ARCHIVED"],
  REJECTED: ["DRAFT", "PENDING", "ARCHIVED"],
  SOLD: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: ListingStatus, to: ListingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Pasos del wizard editables según estado (1..6 = formularios). */
export function editableSteps(status: ListingStatus): number[] {
  if (status === "DRAFT" || status === "REJECTED") return [1, 2, 3, 4, 5, 6];
  if (status === "PUBLISHED") return [6];
  return [];
}

export const STEP_NAMES: Record<number, string> = {
  1: "Vehículo",
  2: "Especificaciones",
  3: "Características",
  4: "Ubicación",
  5: "Fotografías",
  6: "Precio",
  7: "Vista previa",
  8: "Publicación",
};

import { z } from "zod";

// Schemas por paso del wizard + gate de publicación. Servidor manda;
// el cliente usa atributos HTML (required/min/max) + mensajes inline del servidor.

const currentYear = new Date().getFullYear();

export const step1Schema = z.object({
  brandSlug: z.string().trim().min(1, "Elige una marca.").max(60),
  modelSlug: z.string().trim().min(1, "Elige un modelo.").max(60),
  version: z.string().trim().max(60).optional(),
  year: z.coerce.number().int().min(1990, "Año inválido.").max(currentYear + 1, "Año inválido."),
  condition: z.enum(["NEW", "USED", "CERTIFIED"]),
});

export const step2Schema = z.object({
  mileageKm: z.coerce.number().int().min(0, "Kilometraje inválido.").max(2_000_000),
  fuel: z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "CNG"]),
  transmission: z.enum(["MANUAL", "AUTOMATIC", "CVT"]),
  bodyType: z.enum(["SEDAN", "SUV", "COUPE", "HATCHBACK", "PICKUP", "SPORT", "CONVERTIBLE", "VAN"]),
  engine: z.string().trim().max(80).optional(),
  powerHp: z.coerce.number().int().min(1).max(2000).optional(),
  torqueNm: z.coerce.number().int().min(1).max(5000).optional(),
  exteriorColor: z.string().trim().max(40).optional(),
  interiorColor: z.string().trim().max(40).optional(),
});

/** Paso 3: textarea, una característica por línea. Puro y testeable. */
export function parseFeatures(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim().replace(/^[-•\s]+/, ""))
    .filter((line) => line.length > 0);
}

export const step3Schema = z.object({
  featuresText: z.string().max(1200, "Máximo 1200 caracteres en total."),
});

export function validateFeatures(list: string[]): string | null {
  if (list.length > 20) return "Máximo 20 características.";
  const bad = list.find((f) => f.length < 2 || f.length > 60);
  if (bad) return `Cada línea debe tener 2–60 caracteres: "${bad.slice(0, 30)}…"`;
  return null;
}

export const step4Schema = z.object({
  city: z.string().trim().min(2, "Ciudad requerida.").max(80),
  description: z.string().trim().min(50, "Describe el auto con al menos 50 caracteres.").max(2000),
});

const PHOTO_EXT = [".jpg", ".jpeg", ".png", ".webp"];

export const photoSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u.startsWith("https://"), "Solo URLs https.")
    .refine(
      (u) => PHOTO_EXT.some((ext) => u.split("?")[0]?.toLowerCase().endsWith(ext)),
      "La URL debe terminar en .jpg, .jpeg, .png o .webp.",
    ),
});

export const MAX_PHOTOS = 12;

export const step6Schema = z.object({
  priceMXN: z.coerce
    .number()
    .int()
    .min(50_000, "Precio mínimo $50,000.")
    .max(50_000_000, "Precio máximo $50,000,000."),
});

export type DraftLike = {
  brandId: string | null;
  carModelId: string | null;
  year: number | null;
  condition: string | null;
  mileageKm: number | null;
  fuel: string | null;
  transmission: string | null;
  bodyType: string | null;
  city: string | null;
  description: string | null;
  priceMXN: number | null;
  photoCount: number;
};

/** Gate de publicación: lista exhaustiva de faltantes (puro, testeable). */
export function assertPublishable(draft: DraftLike): string[] {
  const missing: string[] = [];
  if (!draft.brandId || !draft.carModelId) missing.push("Vehículo (paso 1) incompleto.");
  if (!draft.year) missing.push("Año requerido (paso 1).");
  if (!draft.condition) missing.push("Condición requerida (paso 1).");
  if (draft.mileageKm === null || draft.mileageKm === undefined) missing.push("Kilometraje requerido (paso 2).");
  if (!draft.fuel || !draft.transmission || !draft.bodyType) missing.push("Especificaciones incompletas (paso 2).");
  if (!draft.city) missing.push("Ubicación requerida (paso 4).");
  if (!draft.description || draft.description.trim().length < 50) {
    missing.push("Descripción de al menos 50 caracteres (paso 4).");
  }
  if (draft.photoCount < 1) missing.push("Al menos 1 fotografía (paso 5).");
  if (!draft.priceMXN || draft.priceMXN < 50_000) missing.push("Precio válido requerido (paso 6).");
  return missing;
}

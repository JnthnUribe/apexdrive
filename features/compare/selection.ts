// Selección del comparador v1: vive en la URL (/compare?a=&b=), compartible y
// sin backend. Límite 2–4 (Fase 4 agrega comparativas guardadas en cuenta).

import { AppError } from "@/lib/errors";

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

export function parseCompareSlugs(params: {
  a?: string;
  b?: string;
  c?: string;
  d?: string;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [params.a, params.b, params.c, params.d]) {
    if (typeof s === "string" && s.length > 0 && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/** Alterna un slug respetando el máximo. */
export function toggleCompareSlugs(current: string[], slug: string): { list: string[]; added: boolean } {
  if (current.includes(slug)) {
    return { list: current.filter((s) => s !== slug), added: false };
  }
  if (current.length >= COMPARE_MAX) return { list: current, added: false };
  return { list: [...current, slug], added: true };
}

export function compareUrl(slugs: string[]): string {
  const keys = ["a", "b", "c", "d"];
  const params = new URLSearchParams();
  slugs.slice(0, COMPARE_MAX).forEach((s, i) => params.set(keys[i] as string, s));
  return `/compare?${params.toString()}`;
}

/** Valida slugs de comparativa (2–4 únicos, no vacíos). Puro y testeable. */
export function validateComparisonSlugs(raw: string[]): string[] {
  const slugs = [...new Set(raw.map((s) => s.trim()).filter((s) => s.length > 0))];
  if (slugs.length < COMPARE_MIN) throw new AppError("UNPROCESSABLE", "Compara al menos 2 vehículos.");
  if (slugs.length > COMPARE_MAX) throw new AppError("UNPROCESSABLE", "Máximo 4 vehículos por comparativa.");
  return slugs;
}

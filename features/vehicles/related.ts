// Algoritmo de relacionados: determinista y explicable, sin ML.
// Puntaje sobre candidato publicado: marca +30 · carrocería +25 ·
// precio ±20% +20 · año ±3 +15 · combustible +10.
// Desempate: más recientes primero. Máx 4.

export type RelatedTarget = {
  id: string;
  brandId: string;
  bodyType: string | null;
  fuel: string | null;
  priceMXN: number | null;
  year: number;
};

export type RelatedCandidate = RelatedTarget & {
  publishedAt: Date | null;
};

export function scoreRelated(target: RelatedTarget, candidate: RelatedCandidate): number {
  let score = 0;
  if (candidate.brandId === target.brandId) score += 30;
  if (target.bodyType && candidate.bodyType === target.bodyType) score += 25;
  if (target.priceMXN && candidate.priceMXN) {
    const diff = Math.abs(candidate.priceMXN - target.priceMXN) / target.priceMXN;
    if (diff <= 0.2) score += 20;
  }
  if (Math.abs(candidate.year - target.year) <= 3) score += 15;
  if (target.fuel && candidate.fuel === target.fuel) score += 10;
  return score;
}

/** Ordena candidatos (sin el actual) por puntaje y recencia. Puro y testeable. */
export function rankRelated<T extends RelatedCandidate>(
  target: RelatedTarget,
  candidates: T[],
  take = 4,
): T[] {
  return candidates
    .filter((c) => c.id !== target.id)
    .map((c) => ({ candidate: c, score: scoreRelated(target, c) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const at = a.candidate.publishedAt?.getTime() ?? 0;
      const bt = b.candidate.publishedAt?.getTime() ?? 0;
      return bt - at;
    })
    .slice(0, take)
    .map((r) => r.candidate);
}

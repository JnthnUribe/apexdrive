/** Formato MXN sin decimales: 499000 → "$499,000". */
export function formatMXN(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError("formatMXN: valor no numérico");
  return "$" + Math.round(value).toLocaleString("es-MX");
}

/** Slug URL-safe. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .slice(0, 80);
}

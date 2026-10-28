// Constructores SEO puros (testeables): metadata de catálogo facetado y
// breadcrumbs JSON-LD. Sin acceso a DB ni request.

export type CatalogMetaInput = {
  brand?: string;
  body?: string;
  q?: string;
  city?: string;
  page?: number;
};

export function buildCatalogMetadata(input: CatalogMetaInput, base: string): {
  title: string;
  description: string;
  canonical: string;
  noindex: boolean;
} {
  const parts: string[] = [];
  if (input.brand) parts.push(input.brand);
  if (input.body) parts.push(input.body);
  if (input.q) parts.push(`“${input.q}”`);
  if (input.city) parts.push(input.city);
  const scope = parts.length > 0 ? parts.join(" · ") : "Catálogo de autos";
  const pageSuffix = input.page && input.page > 1 ? ` (página ${input.page})` : "";
  return {
    title: `${scope}${pageSuffix}`,
    description: `Explora ${scope.toLowerCase()} publicados en ApexDrive: filtra por marca, precio, año y más.${pageSuffix}`,
    canonical: `${base}/cars`,
    // Facetas profundas y paginación no indexan (evita thin/duplicate content).
    noindex: (input.page ?? 1) > 1 || Boolean(input.q),
  };
}

export function buildBreadcrumbs(
  base: string,
  trail: Array<{ name: string; path?: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: `${base}${item.path}` } : {}),
    })),
  };
}

/**
 * Serializa JSON para <script type="application/ld+json"> neutralizando
 * `</script>` y `<` (U+003C): sin esto, un título con `</script>` rompería
 * el bloque y permitiría XSS almacenado. Ver docs/SECURITY.md (XSS-01).
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

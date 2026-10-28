import type { MetadataRoute } from "next";

// Zonas privadas y API fuera del índice. El catálogo facetado se controla
// con noindex por página en su metadata (ver lib/seo.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/sell", "/admin", "/api/"],
      },
    ],
    sitemap: `${process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"}/sitemap.xml`,
  };
}

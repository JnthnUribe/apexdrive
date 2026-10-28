import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompareTray } from "@/features/compare/components/CompareTray";
import { RecentlyViewed } from "@/features/history/components/RecentViews";
import { FiltersPanel } from "@/features/vehicles/components/FiltersPanel";
import { Pagination } from "@/features/vehicles/components/Pagination";
import { SearchBox } from "@/features/vehicles/components/SearchBox";
import { VehicleCard } from "@/features/vehicles/components/VehicleCard";
import { parseCatalogQuery, type CatalogQuery } from "@/features/vehicles/catalogFilters";
import { getBrandsWithCounts, getCatalogPage, getModelsByBrand } from "@/features/vehicles/queries";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { buildCatalogMetadata } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const params = await searchParams;
  const get = (k: string): string | undefined => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const meta = buildCatalogMetadata(
    {
      brand: get("brand"),
      body: get("body"),
      q: get("q"),
      city: get("city"),
      page: Number(get("page") ?? 1) || 1,
    },
    base,
  );
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    ...(meta.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Querystring canónico (sin page) para los enlaces de paginación. */
function baseParamsOf(query: CatalogQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "page" || key === "sort" || value === undefined) continue;
    params.set(key, String(value));
  }
  if (query.sort !== "featured") params.set("sort", query.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

async function Results({ query }: { query: CatalogQuery }) {
  let page;
  try {
    page = await getCatalogPage(query);
  } catch (err) {
    const app =
      err instanceof AppError
        ? err
        : new AppError("INTERNAL", "No se pudo cargar el catálogo.", { cause: err });
    if (!(err instanceof AppError)) logger.error({ err }, "cars: fallo inesperado");
    return (
      <ErrorState
        title="Catálogo no disponible"
        message={app.message}
        requestId={app.requestId}
        retryHref="/cars"
      />
    );
  }
  if (page.items.length === 0) {
    return (
      <EmptyState
        title="Sin resultados"
        description="Ningún vehículo coincide con esos filtros. Ajusta la búsqueda o limpia los filtros."
        action={
          <Link
            href="/cars"
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            Limpiar filtros
          </Link>
        }
      />
    );
  }
  return (
    <>
      <p className="mb-4 text-sm text-muted" role="status">
        {page.total} resultado{page.total === 1 ? "" : "s"} · página {page.page} de {page.pageCount}
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {page.items.map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
      </div>
      <Pagination page={page.page} pageCount={page.pageCount} baseParams={baseParamsOf(query)} />
    </>
  );
}

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let query: CatalogQuery;
  try {
    query = parseCatalogQuery(await searchParams);
  } catch {
    return (
      <Container className="py-10">
        <ErrorState
          title="Filtros inválidos"
          message="Los parámetros de búsqueda no son válidos."
          retryHref="/cars"
        />
      </Container>
    );
  }

  // Marcas/modelos para los selects. Si la DB falla, el catálogo muestra error;
  // los selects se degradan a vacíos en vez de romper la página.
  let brands: Array<{ slug: string; name: string; count: number }> = [];
  let models: Array<{ slug: string; name: string }> = [];
  try {
    [brands, models] = await Promise.all([
      getBrandsWithCounts(),
      query.brand ? getModelsByBrand(query.brand) : Promise.resolve([]),
    ]);
  } catch (err) {
    logger.warn({ err }, "cars: selects sin datos");
  }

  return (
    <Container className="py-10">
      <div className="catalog-heading">
        <div>
          <h1>Encuentra tu próximo auto.</h1>
          <p>Afina tu búsqueda. Compara tus opciones. Elige tu camino.</p>
        </div>
        <span>Explora a tu ritmo</span>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {/* key por query: los controles son no-controlados y deben reiniciarse al navegar */}
        <SearchBox key={`q:${query.q ?? ""}`} initial={query.q ?? ""} />
        <FiltersPanel key={JSON.stringify(query)} brands={brands} models={models} initial={query} />
      </div>
      <div className="mt-8">
        <Suspense
          fallback={
            <div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              aria-busy="true"
              aria-label="Cargando resultados"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          }
        >
          <Results query={query} />
        </Suspense>
      </div>
      <CompareTray />
      <RecentlyViewed />
    </Container>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompareTray, CompareToggle } from "@/features/compare/components/CompareTray";
import { FavoriteButton } from "@/features/vehicles/components/FavoriteButton";
import { Gallery } from "@/features/vehicles/components/Gallery";
import { ShareButton } from "@/features/vehicles/components/ShareButton";
import { VehicleCard } from "@/features/vehicles/components/VehicleCard";
import { ReportForm } from "@/features/reports/components/ReportForm";
import { RecordView } from "@/features/history/components/RecentViews";
import { getRelated, getVehicleBySlug } from "@/features/vehicles/queries";
import { buildVehicleJsonLd } from "@/features/vehicles/vehicleJsonLd";
import { buildBreadcrumbs, safeJsonLd } from "@/lib/seo";
import { isFavorite } from "@/features/favorites/actions";
import { Container } from "@/components/ui/Container";
import { ErrorState } from "@/components/ui/ErrorState";
import { AppError } from "@/lib/errors";
import { formatMXN } from "@/lib/format";
import { logger } from "@/lib/logger";

function spec(label: string, value: string | number | null | undefined): { label: string; value: string } {
  return { label, value: value === null || value === undefined || value === "" ? "—" : String(value) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const vehicle = await getVehicleBySlug(slug);
    if (!vehicle) return { title: "Vehículo no encontrado" };
    const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    const priceText = vehicle.priceMXN !== null ? formatMXN(vehicle.priceMXN) : "precio a convenir";
    return {
      title: vehicle.title,
      description: `${vehicle.brand.name} ${vehicle.carModel.name} ${vehicle.year} en ${vehicle.city ?? "México"} por ${priceText}.`,
      alternates: { canonical: `${base}/cars/${vehicle.slug}` },
      openGraph: {
        title: vehicle.title,
        description: `${vehicle.year} · ${vehicle.mileageKm !== null ? `${vehicle.mileageKm.toLocaleString("es-MX")} km` : "km n/d"} · ${priceText}`,
        url: `${base}/cars/${vehicle.slug}`,
        type: "website",
      },
    };
  } catch {
    return { title: "Catálogo" };
  }
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let vehicle;
  try {
    vehicle = await getVehicleBySlug(slug);
  } catch (err) {
    const app = err instanceof AppError ? err : new AppError("INTERNAL", "No se pudo cargar el vehículo.", { cause: err });
    return (
      <Container className="py-10">
        <ErrorState title="Vehículo no disponible" message={app.message} requestId={app.requestId} retryHref="/cars" />
      </Container>
    );
  }
  if (!vehicle) notFound();

  // Invariante: PUBLISHED siempre completo por el gate de publicación.
  // Si se viola, fallo ruidoso (log + 500) en vez de mostrar "$0" o vacíos.
  if (
    vehicle.priceMXN === null ||
    vehicle.mileageKm === null ||
    !vehicle.fuel ||
    !vehicle.transmission ||
    !vehicle.bodyType ||
    !vehicle.city ||
    !vehicle.description
  ) {
    logger.error({ slug }, "detail: publicación PUBLISHED incompleta en DB");
    throw new AppError("INTERNAL", "Publicación incompleta.");
  }

  const [fav, related] = await Promise.all([
    isFavorite(vehicle.id).catch(() => false),
    getRelated({
      id: vehicle.id,
      brandId: vehicle.brandId,
      bodyType: vehicle.bodyType,
      fuel: vehicle.fuel,
      priceMXN: vehicle.priceMXN,
      year: vehicle.year,
    }).catch((err) => {
      logger.warn({ err }, "detail: sin relacionados");
      return [];
    }),
  ]);

  const specs = [
    spec("Marca", vehicle.brand.name),
    spec("Modelo", vehicle.carModel.name),
    spec("Versión", vehicle.version),
    spec("Año", vehicle.year),
    spec("Kilometraje", `${vehicle.mileageKm.toLocaleString("es-MX")} km`),
    spec("Transmisión", vehicle.transmission),
    spec("Combustible", vehicle.fuel),
    spec("Motor", vehicle.engine),
    spec("Potencia", vehicle.powerHp ? `${vehicle.powerHp} hp` : null),
    spec("Torque", vehicle.torqueNm ? `${vehicle.torqueNm} Nm` : null),
    spec("Color exterior", vehicle.exteriorColor),
    spec("Color interior", vehicle.interiorColor),
    spec("Ubicación", vehicle.city),
    spec("Condición", vehicle.condition),
  ];

  const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const memberSince = new Date(vehicle.seller.createdAt).getFullYear();

  return (
    <Container className="py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildVehicleJsonLd(vehicle, base)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            buildBreadcrumbs(base, [
              { name: "Inicio", path: "/" },
              { name: "Catálogo", path: "/cars" },
              { name: vehicle.brand.name, path: `/cars?brand=${vehicle.brand.slug}` },
              { name: vehicle.title },
            ]),
          ),
        }}
      />
      <RecordView slug={vehicle.slug} title={vehicle.title} brand={vehicle.brand.name} />
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">
        {vehicle.brand.name} · {vehicle.carModel.name}
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{vehicle.title}</h1>
        <p className="text-3xl font-extrabold">{formatMXN(vehicle.priceMXN)}</p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Gallery images={vehicle.images} title={vehicle.title} />
          <h2 className="mt-8 text-xl font-bold">Descripción</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink/90">{vehicle.description}</p>
          <h2 className="mt-8 text-xl font-bold">Especificaciones</h2>
          <dl className="mt-3 overflow-hidden rounded-2xl border border-line text-sm">
            {specs.map((s) => (
              <div key={s.label} className="grid grid-cols-2 gap-2 border-b border-line px-4 py-2.5 last:border-0 odd:bg-neutral-50">
                <dt className="text-muted">{s.label}</dt>
                <dd className="font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
          {vehicle.features.length > 0 ? (
            <>
              <h2 className="mt-8 text-xl font-bold">Características</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {vehicle.features.map((f) => (
                  <li key={f} className="rounded-full bg-ink/5 px-4 py-1.5 text-sm">
                    {f}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line p-5">
            <h2 className="font-bold">Vendedor</h2>
            <p className="mt-1 text-sm font-medium">{vehicle.seller.tradeName ?? "Vendedor particular"}</p>
            <p className="mt-1 text-xs text-muted">
              {vehicle.seller.verified ? "✓ Verificado · " : ""}En ApexDrive desde {memberSince}
            </p>
            <p className="mt-3 text-xs text-muted">
              El contacto directo todavía no está disponible. Puedes guardar o comparar este vehículo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FavoriteButton listingId={vehicle.id} slug={vehicle.slug} initial={fav} />
            <ShareButton title={vehicle.title} path={`/cars/${vehicle.slug}`} />
            <CompareToggle slug={vehicle.slug} />
          </div>
          <ReportForm listingId={vehicle.id} slug={vehicle.slug} />
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Similares</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </section>
      ) : null}
      <CompareTray />
    </Container>
  );
}

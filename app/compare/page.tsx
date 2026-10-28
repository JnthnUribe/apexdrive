import type { Metadata } from "next";
import Link from "next/link";
import { COMPARE_MAX, COMPARE_MIN, parseCompareSlugs } from "@/features/compare/selection";
import { SaveComparisonForm } from "@/features/compare/components/SaveComparisonForm";
import { getVehiclesBySlugs } from "@/features/vehicles/queries";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AppError } from "@/lib/errors";
import { formatMXN } from "@/lib/format";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Comparar" };

// Comparador v1 (Fase 3): tabla lado a lado desde slugs en URL, con diferencias
// resaltadas y sin declarar ganador. Fase 4 agrega guardado en cuenta y diffs ricos.
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; c?: string; d?: string }>;
}) {
  const slugs = parseCompareSlugs(await searchParams);
  if (slugs.length < COMPARE_MIN) {
    return (
      <Container className="max-w-2xl py-14">
        <h1 className="mb-6 text-4xl font-semibold tracking-tight">
          Pon tus opciones en perspectiva.
        </h1>
        <EmptyState
          title="Elige al menos 2 vehículos"
          description={`Abre la ficha de un auto y pulsa "+ Comparar". Puedes elegir hasta ${COMPARE_MAX} vehículos.`}
          action={
            <Link
              href="/cars"
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black"
            >
              Ir al catálogo
            </Link>
          }
        />
      </Container>
    );
  }

  let vehicles;
  try {
    vehicles = await getVehiclesBySlugs(slugs);
  } catch (err) {
    const app =
      err instanceof AppError
        ? err
        : new AppError("INTERNAL", "No se pudo cargar la comparativa.", { cause: err });
    if (!(err instanceof AppError)) logger.error({ err }, "compare: fallo inesperado");
    return (
      <Container className="py-10">
        <ErrorState
          title="Comparativa no disponible"
          message={app.message}
          requestId={app.requestId}
          retryHref="/cars"
        />
      </Container>
    );
  }
  const missing = slugs.filter((s) => !vehicles.some((v) => v.slug === s));
  if (missing.length > 0) {
    return (
      <Container className="py-10">
        <ErrorState
          title="Vehículos no encontrados"
          message={`Ya no están publicados: ${missing.join(", ")}.`}
          retryHref="/cars"
        />
      </Container>
    );
  }

  const rows: Array<{ label: string; values: string[] }> = [
    {
      label: "Precio",
      values: vehicles.map((v) => (v.priceMXN !== null ? formatMXN(v.priceMXN) : "—")),
    },
    { label: "Marca / Modelo", values: vehicles.map((v) => `${v.brand.name} ${v.carModel.name}`) },
    { label: "Año", values: vehicles.map((v) => String(v.year)) },
    {
      label: "Kilometraje",
      values: vehicles.map((v) =>
        v.mileageKm !== null ? `${v.mileageKm.toLocaleString("es-MX")} km` : "—",
      ),
    },
    { label: "Motor", values: vehicles.map((v) => v.engine ?? "—") },
    { label: "Potencia", values: vehicles.map((v) => (v.powerHp ? `${v.powerHp} hp` : "—")) },
    { label: "Torque", values: vehicles.map((v) => (v.torqueNm ? `${v.torqueNm} Nm` : "—")) },
    { label: "Transmisión", values: vehicles.map((v) => v.transmission ?? "—") },
    { label: "Combustible", values: vehicles.map((v) => v.fuel ?? "—") },
    { label: "Carrocería", values: vehicles.map((v) => v.bodyType ?? "—") },
    { label: "Condición", values: vehicles.map((v) => v.condition) },
    { label: "Ubicación", values: vehicles.map((v) => v.city ?? "—") },
  ];

  const prices = vehicles.map((v) => v.priceMXN).filter((p): p is number => p !== null);
  const priceRange = prices.length >= 2 ? Math.max(...prices) - Math.min(...prices) : 0;

  return (
    <Container className="py-10">
      <h1 className="text-4xl font-bold tracking-tight">Comparar ({vehicles.length})</h1>
      <p className="mt-1 text-sm text-muted">
        Filas resaltadas = valores diferentes. Sin ganador declarado.
        {priceRange > 0 ? ` Rango de precios: ${formatMXN(priceRange)} (informativo).` : ""}
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left">
              <th scope="col" className="p-4 font-semibold">
                Característica
              </th>
              {vehicles.map((v) => (
                <th scope="col" key={v.id} className="p-4">
                  <Link href={`/cars/${v.slug}`} className="font-bold hover:underline">
                    {v.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const differ = new Set(r.values).size > 1;
              return (
                <tr key={r.label} className={differ ? "bg-amber-50/60" : undefined}>
                  <td className="p-4 font-medium text-muted">{r.label}</td>
                  {r.values.map((val, i) => (
                    <td key={vehicles[i]?.id} className={cn("p-4", differ && "font-semibold")}>
                      {val}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SaveComparisonForm slugs={slugs} />
    </Container>
  );
}

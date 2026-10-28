import Link from "next/link";
import { formatMXN } from "@/lib/format";
import type { CatalogCard } from "@/features/vehicles/queries";
import { SafeImage } from "./SafeImage";
import { VehiclePlaceholder } from "./VehiclePlaceholder";
import { VEHICLE_LABELS } from "@/features/vehicles/labels";

/** Card del catálogo (Server). Sin botón de favorito aquí: exigiría 1 query
 *  de sesión por card (N+1). El favorito vive en el detalle (1 query). */
export function VehicleCard({ vehicle }: { vehicle: CatalogCard }) {
  const photo = vehicle.images[0]?.r2Key;
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-lg">
      <Link href={`/cars/${vehicle.slug}`} aria-label={vehicle.title}>
        <div className="relative aspect-[4/3] bg-slate-100">
          {photo ? (
            <SafeImage src={photo} alt={vehicle.title} />
          ) : (
            <VehiclePlaceholder title={vehicle.title} />
          )}
          <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1.5 text-[10px] font-semibold text-ink">
            {VEHICLE_LABELS[vehicle.condition] ?? vehicle.condition}
          </span>
        </div>
      </Link>
      <div className="p-5">
        <p className="text-[11px] font-semibold text-muted">
          {vehicle.brand.name} · {vehicle.carModel.name}
        </p>
        <h3 className="mt-1 font-bold">
          <Link href={`/cars/${vehicle.slug}`} className="hover:underline">
            {vehicle.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted">
          {vehicle.year} ·{" "}
          {vehicle.mileageKm !== null
            ? `${vehicle.mileageKm.toLocaleString("es-MX")} km`
            : "km n/d"}{" "}
          · {vehicle.city ?? "México"}
        </p>
        <div className="mt-4 flex items-end justify-between gap-2 border-t border-line pt-4">
          <div>
            <p className="text-[10px] text-muted">Precio en MXN</p>
            <p className="mt-1 text-xl font-bold tracking-tight">
              {vehicle.priceMXN !== null ? formatMXN(vehicle.priceMXN) : "Por confirmar"}
            </p>
          </div>
          <Link
            href={`/cars/${vehicle.slug}`}
            aria-label={`Ver detalles de ${vehicle.title}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl text-brand hover:bg-blue-100"
          >
            ↗
          </Link>
        </div>
      </div>
    </article>
  );
}

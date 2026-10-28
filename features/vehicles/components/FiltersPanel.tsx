"use client";
// Cliente porque cada cambio reescribe la URL al instante (sin submit).
// Al cambiar de marca se resetea el modelo (evita combinaciones imposibles).

import Link from "next/link";
import { SORT_KEYS, type CatalogQuery, type SortKey } from "@/features/vehicles/catalogFilters";
import { useCatalogParams } from "./useCatalogParams";
import { VEHICLE_LABELS } from "@/features/vehicles/labels";

const FUELS = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "CNG"] as const;
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC", "CVT"] as const;
const BODIES = [
  "SEDAN",
  "SUV",
  "COUPE",
  "HATCHBACK",
  "PICKUP",
  "SPORT",
  "CONVERTIBLE",
  "VAN",
] as const;
const CONDITIONS = ["NEW", "USED", "CERTIFIED"] as const;
const newestYear = new Date().getFullYear() + 1;
const YEARS = Array.from({ length: newestYear - 1990 + 1 }, (_, i) => String(newestYear - i));

const SORT_LABELS: Record<SortKey, string> = {
  featured: "Destacados",
  "price-asc": "Menor precio",
  "price-desc": "Mayor precio",
  newest: "Más recientes",
  "mileage-asc": "Menor kilometraje",
  "year-desc": "Más nuevos",
};

const selectClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink";
const labelClass = "mb-1 block text-xs font-semibold tracking-wide text-muted";

export function FiltersPanel({
  brands,
  models,
  initial,
}: {
  brands: Array<{ slug: string; name: string; count: number }>;
  models: Array<{ slug: string; name: string }>;
  initial: CatalogQuery;
}) {
  const { set } = useCatalogParams();
  const num = (v: string): string | undefined => (v === "" ? undefined : v);

  return (
    <details className="rounded-xl border border-line bg-slate-50 p-5" open>
      <summary className="mb-4 flex min-h-8 items-center justify-between font-semibold text-sm">
        Personaliza tu búsqueda{" "}
        <span className="text-muted text-xs font-normal">Filtros y orden</span>
      </summary>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <label>
            <span className={labelClass}>Marca</span>
            <select
              className={selectClass}
              defaultValue={initial.brand ?? ""}
              onChange={(e) => set({ brand: e.target.value || undefined, model: undefined })}
            >
              <option value="">Todas</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name} ({b.count})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Modelo</span>
            <select
              className={selectClass}
              defaultValue={initial.model ?? ""}
              disabled={models.length === 0}
              onChange={(e) => set({ model: e.target.value || undefined })}
            >
              <option value="">{initial.brand ? "Todos" : "Elige marca"}</option>
              {models.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Año mín.</span>
            <select
              className={selectClass}
              defaultValue={initial.minYear ?? ""}
              onChange={(e) => set({ minYear: num(e.target.value) })}
            >
              <option value="">—</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Año máx.</span>
            <select
              className={selectClass}
              defaultValue={initial.maxYear ?? ""}
              onChange={(e) => set({ maxYear: num(e.target.value) })}
            >
              <option value="">—</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Precio mín.</span>
            <input
              className={selectClass}
              type="number"
              min={0}
              step={10000}
              defaultValue={initial.minPrice ?? ""}
              onChange={(e) => set({ minPrice: num(e.target.value) })}
            />
          </label>
          <label>
            <span className={labelClass}>Precio máx.</span>
            <input
              className={selectClass}
              type="number"
              min={0}
              step={10000}
              defaultValue={initial.maxPrice ?? ""}
              onChange={(e) => set({ maxPrice: num(e.target.value) })}
            />
          </label>
          <label>
            <span className={labelClass}>Km máx.</span>
            <input
              className={selectClass}
              type="number"
              min={0}
              step={5000}
              defaultValue={initial.maxMileage ?? ""}
              onChange={(e) => set({ maxMileage: num(e.target.value) })}
            />
          </label>
          <label>
            <span className={labelClass}>Combustible</span>
            <select
              className={selectClass}
              defaultValue={initial.fuel ?? ""}
              onChange={(e) => set({ fuel: (e.target.value || undefined) as CatalogQuery["fuel"] })}
            >
              <option value="">Todos</option>
              {FUELS.map((f) => (
                <option key={f} value={f}>
                  {VEHICLE_LABELS[f]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Transmisión</span>
            <select
              className={selectClass}
              defaultValue={initial.transmission ?? ""}
              onChange={(e) =>
                set({ transmission: (e.target.value || undefined) as CatalogQuery["transmission"] })
              }
            >
              <option value="">Todas</option>
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>
                  {VEHICLE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Carrocería</span>
            <select
              className={selectClass}
              defaultValue={initial.body ?? ""}
              onChange={(e) => set({ body: (e.target.value || undefined) as CatalogQuery["body"] })}
            >
              <option value="">Todas</option>
              {BODIES.map((b) => (
                <option key={b} value={b}>
                  {VEHICLE_LABELS[b]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Condición</span>
            <select
              className={selectClass}
              defaultValue={initial.condition ?? ""}
              onChange={(e) =>
                set({ condition: (e.target.value || undefined) as CatalogQuery["condition"] })
              }
            >
              <option value="">Todas</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {VEHICLE_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Ubicación</span>
            <input
              className={selectClass}
              defaultValue={initial.city ?? ""}
              maxLength={80}
              placeholder="Ciudad"
              onChange={(e) => set({ city: e.target.value.trim() || undefined })}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Ordenar:</span>
            <select
              aria-label="Ordenar resultados"
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium outline-none focus:border-ink"
              defaultValue={initial.sort}
              onChange={(e) => set({ sort: e.target.value })}
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <Link href="/cars" className="text-sm font-semibold underline underline-offset-4">
            Limpiar filtros
          </Link>
        </div>
      </div>
    </details>
  );
}

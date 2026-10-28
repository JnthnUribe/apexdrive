// Historial reciente RESPONSABLE: solo localStorage del propio navegador,
// sin cuenta ni servidor (cero tracking cross-device, borrable con 1 click).
// Se guarda ficha mínima (sin precios: evita mostrar datos desactualizados).

export type RecentView = { slug: string; title: string; brand: string; at: number };

export const RECENT_KEY = "apex.recent";
export const RECENT_MAX = 10;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readRecent(storage: StorageLike): RecentView[] {
  try {
    const raw = storage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is RecentView =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as RecentView).slug === "string" &&
        typeof (v as RecentView).title === "string",
    );
  } catch {
    return [];
  }
}

/** Agrega al frente, sin duplicados, tope 10. Puro y testeable. */
export function addRecent(list: RecentView[], view: Omit<RecentView, "at">): RecentView[] {
  const entry: RecentView = { ...view, at: Date.now() };
  return [entry, ...list.filter((v) => v.slug !== view.slug)].slice(0, RECENT_MAX);
}

export function writeRecent(storage: StorageLike, list: RecentView[]): void {
  storage.setItem(RECENT_KEY, JSON.stringify(list));
}

export function clearRecent(storage: StorageLike): void {
  storage.removeItem(RECENT_KEY);
}

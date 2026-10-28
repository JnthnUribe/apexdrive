"use client";
// Cliente porque la selección vive en localStorage + evento de ventana.
// El tray construye /compare?a=&b= con datos reales (Fase 4 agrega guardado en cuenta).

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { compareUrl, toggleCompareSlugs } from "@/features/compare/selection";

const KEY = "apex.compare";
const EVENT = "apex:compare";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Suscripción a la selección (evento de ventana). Sin setState directo en el
 *  efecto: la lectura inicial se dispara emitiendo el propio evento. */
function useCompareList(): { list: string[]; update: (next: string[]) => void } {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const sync = (): void => setList(read());
    window.addEventListener(EVENT, sync);
    window.dispatchEvent(new Event(EVENT));
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return {
    list,
    update: (next: string[]) => {
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
    },
  };
}

/** Botón para agregar/quitar el vehículo actual de la comparativa. */
export function CompareToggle({ slug }: { slug: string }) {
  const { list, update } = useCompareList();
  const added = list.includes(slug);

  function onToggle(): void {
    const { list: next } = toggleCompareSlugs(list, slug);
    update(next);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={added}
      className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold hover:bg-ink/5"
    >
      {added ? "✓ En comparativa" : "+ Comparar"}
    </button>
  );
}

/** Barra flotante con la selección actual. Solo se renderiza si hay selección. */
export function CompareTray() {
  const { list, update } = useCompareList();

  const clear = useCallback(() => {
    update([]);
  }, [update]);

  if (list.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full border border-line bg-white px-5 py-3 shadow-xl">
      <p className="text-sm font-medium">
        {list.length} para comparar{list.length < 2 ? " (mínimo 2)" : ""}
      </p>
      {list.length >= 2 ? (
        <Link href={compareUrl(list)} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black">
          Comparar ahora
        </Link>
      ) : null}
      <button type="button" onClick={clear} className="text-sm text-muted underline">
        Limpiar
      </button>
    </div>
  );
}

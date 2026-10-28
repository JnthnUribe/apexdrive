"use client";
// Cliente porque lee/escribe localStorage del navegador. Sin cuenta ni red:
// el historial nunca sale del dispositivo (diseño responsable, ver recentViews.ts).

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  RECENT_KEY,
  addRecent,
  clearRecent,
  readRecent,
  writeRecent,
  type RecentView,
} from "@/features/history/recentViews";

/** Registra la visita actual (detalle). Sin render. */
export function RecordView({ slug, title, brand }: Omit<RecentView, "at">) {
  useEffect(() => {
    const list = addRecent(readRecent(localStorage), { slug, title, brand });
    writeRecent(localStorage, list);
    window.dispatchEvent(new Event("apex:recent"));
  }, [slug, title, brand]);
  return null;
}

/** Chips de vistos recientemente. Nada que mostrar → nada se renderiza. */
export function RecentlyViewed() {
  const [views, setViews] = useState<RecentView[]>([]);
  useEffect(() => {
    const sync = (): void => setViews(readRecent(localStorage));
    sync();
    window.addEventListener("apex:recent", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("apex:recent", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (views.length === 0) return null;
  return (
    <section aria-label="Vistos recientemente" className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Vistos recientemente</h2>
        <button
          type="button"
          onClick={() => {
            clearRecent(localStorage);
            setViews([]);
          }}
          className="text-xs text-muted underline"
        >
          Borrar (solo este navegador, clave {RECENT_KEY})
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {views.map((v) => (
          <li key={v.slug}>
            <Link
              href={`/cars/${v.slug}`}
              className="inline-block rounded-full border border-line px-4 py-2 text-sm transition-colors hover:bg-ink hover:text-white"
            >
              {v.brand} · {v.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

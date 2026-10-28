"use client";
// Cliente por debounce local: evita 1 navegación por tecla mientras escribe.

import { useEffect, useState } from "react";
import { useCatalogParams } from "./useCatalogParams";

export function SearchBox({ initial }: { initial: string }) {
  const { get, set } = useCatalogParams();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const current = get("q");
    if (value === current) return;
    const timer = setTimeout(() => set({ q: value.trim() || undefined }), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="block">
      <span className="sr-only">Buscar por texto</span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="¿Qué automóvil estás buscando?"
        maxLength={80}
        className="w-full rounded-full border border-line bg-white px-5 py-3 text-sm outline-none placeholder:text-muted focus:border-ink"
      />
    </label>
  );
}

"use client";
// Strip empty filters before navigating to the validated catalog URL.
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
export function HomeSearch({ brands }: { brands: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    router.push(`/cars${params.size ? `?${params}` : ""}`);
  }
  return (
    <form
      onSubmit={search}
      action="/cars"
      className="home-search"
      aria-label="Encuentra tu próximo auto"
    >
      <label>
        <span>¿Qué auto buscas?</span>
        <input name="q" maxLength={80} placeholder="Marca o modelo" />
      </label>
      <label>
        <span>Marca</span>
        <select name="brand" defaultValue="">
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Tu presupuesto</span>
        <select name="maxPrice" defaultValue="">
          <option value="">Cualquier precio</option>
          <option value="250000">Hasta $250,000</option>
          <option value="500000">Hasta $500,000</option>
          <option value="1000000">Hasta $1,000,000</option>
        </select>
      </label>
      <button type="submit" className="button-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Buscar autos
      </button>
    </form>
  );
}

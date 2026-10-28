"use client";
// Cliente por selects dependientes (modelos según marca) y redirect al crear.
// La marca/modelo se revalidan en servidor (anti-manipulación).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createDraftAction } from "@/features/listings/actions";

export function NewListingForm({
  brands,
}: {
  brands: Array<{ slug: string; name: string; models: Array<{ slug: string; name: string }> }>;
}) {
  const router = useRouter();
  const [brandSlug, setBrandSlug] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const models = brands.find((b) => b.slug === brandSlug)?.models ?? [];
  const year = new Date().getFullYear();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setPending(true);
    setError("");
    const res = await createDraftAction(null, new FormData(e.currentTarget));
    if (res.ok && res.draftId) {
      router.push(`/sell/${res.draftId}/step/2`);
      return;
    }
    setError(res.message);
    setPending(false);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-6 flex max-w-2xl flex-col gap-4">
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Marca</span>
          <select
            name="brandSlug"
            required
            value={brandSlug}
            onChange={(e) => setBrandSlug(e.target.value)}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-ink"
          >
            <option value="">Elige…</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Modelo</span>
          <select
            name="modelSlug"
            required
            disabled={models.length === 0}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-ink disabled:opacity-50"
          >
            <option value="">{brandSlug ? "Elige…" : "Primero la marca"}</option>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Input label="Versión (opcional)" name="version" maxLength={60} placeholder="Ej. XLE, Touring" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Año" name="year" type="number" required min={1990} max={year + 1} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Condición</span>
          <select name="condition" required defaultValue="USED" className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-ink">
            <option value="NEW">Nuevo</option>
            <option value="USED">Usado</option>
            <option value="CERTIFIED">Certificado</option>
          </select>
        </label>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creando borrador…" : "Crear borrador y continuar"}
        </Button>
      </div>
    </form>
  );
}

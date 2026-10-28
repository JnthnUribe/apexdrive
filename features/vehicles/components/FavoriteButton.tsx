"use client";
// Cliente por toggle optimista: pinta el nuevo estado al instante y revierte
// solo si el servidor falla (feedback inmediato sin sacrificar verdad).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleFavorite } from "@/features/favorites/actions";
import { cn } from "@/lib/cn";

export function FavoriteButton({
  listingId,
  slug,
  initial,
}: {
  listingId: string;
  slug: string;
  initial: boolean;
}) {
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onToggle(): Promise<void> {
    const previous = fav;
    setFav(!previous);
    setPending(true);
    setFailed(false);
    try {
      const res = await toggleFavorite(listingId);
      setFav(res.favorited);
      router.refresh();
    } catch {
      setFav(previous);
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void onToggle()}
        disabled={pending}
        aria-pressed={fav}
        className={cn(
          "rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
          fav ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-ink/5",
        )}
      >
        {pending ? "Guardando…" : fav ? "♥ Guardado" : "♡ Guardar"}
      </button>
      {failed ? (
        <p role="alert" className="text-xs text-red-700">
          No se pudo guardar.{" "}
          <Link href={`/login?callbackUrl=${encodeURIComponent(`/cars/${slug}`)}`} className="underline">
            Inicia sesión
          </Link>
        </p>
      ) : null}
    </div>
  );
}

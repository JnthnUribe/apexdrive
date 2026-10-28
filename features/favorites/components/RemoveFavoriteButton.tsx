"use client";
// Cliente por llamada directa a la Server Action + refresh. Sin confirmación:
// quitar un favorito es reversible con 1 click.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleFavorite } from "@/features/favorites/actions";

export function RemoveFavoriteButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onRemove(): Promise<void> {
    setPending(true);
    try {
      await toggleFavorite(listingId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onRemove()}
      disabled={pending}
      className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold hover:bg-ink/5 disabled:opacity-50"
    >
      {pending ? "…" : "Quitar"}
    </button>
  );
}

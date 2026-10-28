"use client";
// Cliente por window.confirm nativo antes del borrado (sin JS extra).

import { useState } from "react";
import { deletePhotoAction } from "@/features/listings/actions";

export function DeletePhotoButton({ draftId, photoId }: { draftId: string; photoId: string }) {
  const [pending, setPending] = useState(false);

  async function onDelete(): Promise<void> {
    if (!window.confirm("¿Eliminar esta fotografía?")) return;
    setPending(true);
    const form = new FormData();
    form.append("draftId", draftId);
    form.append("photoId", photoId);
    await deletePhotoAction(null, form);
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={() => void onDelete()}
      disabled={pending}
      className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
    >
      {pending ? "…" : "Eliminar"}
    </button>
  );
}

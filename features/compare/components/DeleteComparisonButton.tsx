"use client";
// Cliente por llamada directa + refresh. Solo aparece en contenido propio.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteComparisonAction } from "@/features/compare/actions";

export function DeleteComparisonButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete(): Promise<void> {
    if (!window.confirm("¿Eliminar esta comparativa guardada?")) return;
    setPending(true);
    const form = new FormData();
    form.append("id", id);
    await deleteComparisonAction(null, form);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void onDelete()}
      disabled={pending}
      className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold hover:bg-ink/5 disabled:opacity-50"
    >
      {pending ? "…" : "Eliminar"}
    </button>
  );
}

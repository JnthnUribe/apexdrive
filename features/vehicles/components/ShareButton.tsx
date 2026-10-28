"use client";
// Cliente porque usa Web Share API / portapapeles del navegador.

import { useState } from "react";

export function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare(): Promise<void> {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return; // cancelado por el usuario: no es error
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold hover:bg-ink/5"
    >
      {copied ? "¡Enlace copiado!" : "Compartir"}
    </button>
  );
}

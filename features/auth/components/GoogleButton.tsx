"use client";
// Cliente porque dispara el flujo OAuth de Auth.js en el navegador.

import { signIn } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function GoogleButton({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={!enabled || pending}
      title={
        enabled
          ? "Continuar con Google"
          : "El acceso con Google todavía no está disponible. Usa tu correo."
      }
      onClick={() => {
        setPending(true);
        void signIn("google", { callbackUrl: "/dashboard" });
      }}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-semibold transition-colors",
        enabled ? "text-ink hover:bg-ink/5" : "cursor-not-allowed text-muted opacity-60",
      )}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.6z"
        />
        <path
          fill="currentColor"
          opacity=".6"
          d="M12 22c2.7 0 5-.9 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.6 0-4.8-1.7-5.6-4.1H3v2.7C4.6 19.9 8 22 12 22z"
        />
        <path
          fill="currentColor"
          opacity=".3"
          d="M6.4 14c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2V7.3H3C2.4 8.5 2 9.7 2 11s.4 3.5 1 4.7l3.4-1.7z"
        />
      </svg>
      {pending ? "Conectando…" : enabled ? "Continuar con Google" : "Google no disponible"}
    </button>
  );
}

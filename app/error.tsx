"use client";
// Captura errores de render en el segmento. Muestra mensaje seguro + acción de
// reintento; el digest permite correlacionar con logs del servidor.

import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="flex max-w-2xl flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-sm font-semibold tracking-widest text-muted">500</p>
      <h1 className="text-3xl font-bold tracking-tight">Algo salió mal</h1>
      <p className="text-sm text-muted">
        Ocurrió un error inesperado.
        {error.digest ? (
          <>
            {" "}
            Referencia: <code className="rounded bg-ink/5 px-1.5 py-0.5">{error.digest}</code>
          </>
        ) : null}
      </p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-full bg-ink/5 px-6 py-3 text-sm font-semibold text-ink hover:bg-ink/10"
        >
          Ir al inicio
        </Link>
      </div>
    </Container>
  );
}

"use client";
// Cliente porque consulta /api/healthz en el navegador y reintenta bajo demanda.
// Patrón suscripción: el efecto solo se suscribe a la promesa fetch; el estado
// cambia en callbacks (.then/.catch) y en el manejador del botón Reintentar.

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type HealthData = {
  status: "ok" | "degraded";
  version: string;
  time: string;
  database: { connected: boolean; latencyMs?: number };
};

type State = { kind: "loading" } | { kind: "ready"; data: HealthData } | { kind: "error" };

export function StatusCard() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/healthz", { cache: "no-store" })
      .then((res) => res.json() as Promise<HealthData>)
      .then((data) => {
        if (alive) setState({ kind: "ready", data });
      })
      .catch(() => {
        if (alive) setState({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  if (state.kind === "loading") {
    return (
      <div className="mt-6 rounded-2xl border border-line p-6" aria-busy="true" aria-label="Cargando estado">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6" role="alert">
        <p className="font-semibold text-red-800">No se pudo contactar al servidor.</p>
        <p className="mt-1 text-sm text-red-700">Revisa tu conexión e inténtalo de nuevo.</p>
        <button
          type="button"
          onClick={() => {
            setState({ kind: "loading" });
            setNonce((n) => n + 1);
          }}
          className="mt-4 rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const ok = state.data.status === "ok";
  return (
    <dl className="mt-6 grid gap-4 rounded-2xl border border-line p-6 sm:grid-cols-3">
      <div>
        <dt className="text-xs font-semibold tracking-widest text-muted">ESTADO</dt>
        <dd
          className={cn(
            "mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold",
            ok ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800",
          )}
        >
          {ok ? "Operativo" : "Degradado"}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold tracking-widest text-muted">BASE DE DATOS</dt>
        <dd className="mt-1 text-sm font-medium">
          {state.data.database.connected
            ? `Conectada (${state.data.database.latencyMs ?? "?"} ms)`
            : "No configurada"}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold tracking-widest text-muted">VERSIÓN</dt>
        <dd className="mt-1 text-sm font-medium">{state.data.version}</dd>
      </div>
    </dl>
  );
}

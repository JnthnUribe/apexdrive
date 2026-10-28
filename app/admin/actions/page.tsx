import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { getAuditLog } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Auditoría" };

/** Siempre dinámica: depende de sesión ADMIN (sin prerender estático). */
export const dynamic = "force-dynamic";

/** Log append-only de acciones administrativas (solo lectura). */
export default async function AdminActionsPage() {
  let rows;
  try {
    rows = await getAuditLog();
  } catch {
    return (
      <Container className="max-w-5xl py-12">
        <ErrorState title="Auditoría no disponible" message="La base de datos no está disponible." retryHref="/admin/actions" />
      </Container>
    );
  }
  return (
    <Container className="max-w-5xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">Auditoría</h1>
      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Sin acciones" description="Aún no hay acciones administrativas registradas." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs text-muted">
                <th scope="col" className="p-3">Fecha</th>
                <th scope="col" className="p-3">Admin</th>
                <th scope="col" className="p-3">Acción</th>
                <th scope="col" className="p-3">Objetivo</th>
                <th scope="col" className="p-3">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 text-xs">{r.createdAt.toLocaleString("es-MX")}</td>
                  <td className="p-3">{r.adminEmail}</td>
                  <td className="p-3 font-semibold">{r.action}</td>
                  <td className="p-3 font-mono text-xs">{r.targetType}:{r.targetId.slice(0, 8)}…</td>
                  <td className="p-3 text-xs text-muted">{r.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}

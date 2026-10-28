import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ErrorState } from "@/components/ui/ErrorState";
import { UserStatusButton } from "@/features/admin/components/UserStatusButton";
import { getAdminUsers } from "@/features/admin/queries";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Usuarios" };

/** Siempre dinámica: depende de sesión ADMIN (sin prerender estático). */
export const dynamic = "force-dynamic";

/** Usuarios (sin passwordHash ni tokens, por proyección). Bloquear revoca sesiones. */
export default async function AdminUsersPage() {
  let users;
  try {
    users = await getAdminUsers();
  } catch {
    return (
      <Container className="max-w-5xl py-12">
        <ErrorState title="Usuarios no disponibles" message="La base de datos no está disponible." retryHref="/admin/users" />
      </Container>
    );
  }
  return (
    <Container className="max-w-5xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">Usuarios ({users.length})</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-xs text-muted">
              <th scope="col" className="p-3">Correo</th>
              <th scope="col" className="p-3">Rol</th>
              <th scope="col" className="p-3">Estado</th>
              <th scope="col" className="p-3">Pubs</th>
              <th scope="col" className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-medium">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", u.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                    {u.status}
                  </span>
                </td>
                <td className="p-3">{u.listings}</td>
                <td className="p-3">
                  <UserStatusButton id={u.id} status={u.status} role={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Container>
  );
}

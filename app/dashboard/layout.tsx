import type { ReactNode } from "react";
import { guardLayout } from "@/lib/authz";

/** Toda /dashboard exige sesión activa; si no, redirige a /login. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await guardLayout("/dashboard");
  return <>{children}</>;
}

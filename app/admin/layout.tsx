import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { AppError } from "@/lib/errors";

/** Toda /admin exige ADMIN verificado contra DB; si no, a /forbidden. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AppError) redirect("/forbidden");
    throw err;
  }
  return <>{children}</>;
}

"use client";
// Cliente por useActionState. Bloquear revoca sesiones (tokenVersion++);
// el botón se oculta para otros ADMIN (defensa en UI + servidor).

import { useActionState } from "react";
import { userStatusAction, type AdminActionResult } from "@/features/admin/actions";
import { cn } from "@/lib/cn";

const INITIAL: AdminActionResult = { ok: false, message: "" };

export function UserStatusButton({
  id,
  status,
  role,
}: {
  id: string;
  status: "ACTIVE" | "BLOCKED";
  role: string;
}) {
  const [state, submit, pending] = useActionState(userStatusAction, INITIAL);
  if (role === "ADMIN") {
    return <span className="text-xs text-muted">Protegido</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      <form action={submit}>
        <input type="hidden" name="id" value={id} />
        <button
          name="status"
          value={status === "ACTIVE" ? "BLOCKED" : "ACTIVE"}
          disabled={pending}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50",
            status === "ACTIVE"
              ? "bg-red-700 text-white hover:bg-red-800"
              : "bg-green-700 text-white hover:bg-green-800",
          )}
        >
          {status === "ACTIVE" ? "Bloquear" : "Reactivar"}
        </button>
      </form>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-green-700" : "text-xs text-red-700"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

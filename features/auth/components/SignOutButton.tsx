import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/features/auth/actions";

/** Cierre de sesión: Server Action real (revoca en servidor), no solo limpia cliente. */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost">
        Cerrar sesión
      </Button>
    </form>
  );
}

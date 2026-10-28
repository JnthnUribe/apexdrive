import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="flex max-w-2xl flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-sm font-semibold tracking-widest text-muted">404</p>
      <h1 className="text-3xl font-bold tracking-tight">Esta ruta no existe</h1>
      <p className="text-sm text-muted">La página que buscas fue movida o nunca existió.</p>
      <Link href="/" className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black">
        Volver al inicio
      </Link>
    </Container>
  );
}

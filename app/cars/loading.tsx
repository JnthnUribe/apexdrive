import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CarsLoading() {
  return (
    <Container className="py-10" aria-busy="true" aria-label="Cargando catálogo">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-6 h-12 w-full" />
      <Skeleton className="mt-4 h-40 w-full" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </Container>
  );
}

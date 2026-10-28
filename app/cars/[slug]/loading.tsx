import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

export default function VehicleLoading() {
  return (
    <Container className="py-10" aria-busy="true" aria-label="Cargando vehículo">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-3 h-10 w-3/4" />
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div>
          <Skeleton className="aspect-[16/9] w-full" />
          <Skeleton className="mt-6 h-6 w-40" />
          <Skeleton className="mt-3 h-24 w-full" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </Container>
  );
}

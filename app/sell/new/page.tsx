import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ErrorState } from "@/components/ui/ErrorState";
import { NewListingForm } from "@/features/listings/components/NewListingForm";
import { getBrandsWithModels } from "@/features/listings/queries";

export const metadata: Metadata = { title: "Nueva publicación" };

/** Siempre dinámica: lee el catálogo de marcas en cada request (sin prerender). */
export const dynamic = "force-dynamic";

/** Paso 1 (creación). El proxy ya garantizó SELLER/ADMIN. */
export default async function SellNewPage() {
  let brands;
  try {
    brands = await getBrandsWithModels();
  } catch {
    return (
      <Container className="max-w-3xl py-12">
        <ErrorState
          title="No se pudo cargar el catálogo de marcas"
          message="La base de datos no está disponible. Inténtalo más tarde."
          retryHref="/sell/new"
        />
      </Container>
    );
  }
  return (
    <Container className="max-w-3xl py-12">
      <p className="text-xs font-semibold tracking-widest text-muted">PASO 1 DE 8 · VEHÍCULO</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">¿Qué auto vas a publicar?</h1>
      <NewListingForm brands={brands} />
    </Container>
  );
}

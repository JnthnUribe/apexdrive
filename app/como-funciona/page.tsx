import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Encuentra, compara y guarda tus autos favoritos. Conoce cómo publicar tu auto en ApexDrive.",
};
export default function HowItWorks() {
  return (
    <Container className="py-12 md:py-20">
      <div className="catalog-heading">
        <div>
          <p className="mb-4">Tu siguiente capítulo.</p>
          <h1>
            Menos vueltas.
            <br />
            Más camino.
          </h1>
          <p>Un espacio para explorar autos y decidir con información.</p>
        </div>
        <Link href="/cars" className="button-primary">
          Explorar autos
        </Link>
      </div>
      <div className="my-10 grid gap-10 md:grid-cols-2">
        <div className="relative min-h-72 overflow-hidden rounded-xl">
          <Image
            src="/images/baja-suv.webp"
            alt="SUV de concepto; imagen editorial generada con IA"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-7 py-4">
          {[
            [
              "01",
              "Encuentra",
              "Busca por marca, modelo, presupuesto y ubicación. Abre una publicación para ver su galería, características y datos del vendedor.",
            ],
            [
              "02",
              "Compara",
              "Agrega de dos a cuatro autos desde sus fichas. Revisa sus precios, kilometraje y características en una sola tabla.",
            ],
            [
              "03",
              "Guarda",
              "Crea tu cuenta para guardar favoritos y comparativas. Puedes volver a ellos cuando quieras desde Mi cuenta.",
            ],
          ].map(([number, title, text]) => (
            <section key={number} className="flex gap-5">
              <span className="text-sm font-semibold text-brand">{number}</span>
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted">{text}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
      <section className="rounded-2xl bg-ink p-8 text-white md:p-12">
        <h2 className="text-3xl font-semibold tracking-tight">
          ¿Tu auto está listo para una nueva historia?
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
          Con una cuenta habilitada como vendedor puedes preparar tu publicación en ocho pasos,
          guardar el borrador y enviarlo a revisión. Las cuentas nuevas comienzan como compradores;
          la habilitación de vendedor requiere gestión del administrador.
        </p>
        <Link href="/sell" className="button-light mt-6">
          Ir a vender mi auto
        </Link>
      </section>
      <section className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold">Qué puedes hacer hoy</h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          ApexDrive permite explorar publicaciones, comparar vehículos y organizar favoritos. No
          procesa pagos ni reservas. El contacto con vendedores dentro de la plataforma todavía no
          está disponible. La disponibilidad de publicaciones y cuentas depende de que el servicio
          esté activo.
        </p>
        <p className="mt-4 text-xs text-muted">
          Las imágenes de campaña son conceptos generados con IA. No representan inventario ni
          sustituyen las fotos de cada publicación.
        </p>
      </section>
    </Container>
  );
}

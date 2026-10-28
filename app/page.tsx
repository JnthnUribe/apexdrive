import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { HomeSearch } from "@/components/home/HomeSearch";
import { VehicleCard } from "@/features/vehicles/components/VehicleCard";
import {
  getBrandsWithCounts,
  getLatestPublished,
  type CatalogCard,
} from "@/features/vehicles/queries";

export const revalidate = 3600;
const collections = [
  {
    title: "Para salir de la rutina.",
    text: "Deportivos",
    href: "/cars?body=SPORT",
    image: "/images/coastal-coupe.webp",
    alt: "Concepto de coupé azul frente al Pacífico",
  },
  {
    title: "Espacio para más planes.",
    text: "SUVs",
    href: "/cars?body=SUV",
    image: "/images/baja-suv.webp",
    alt: "Concepto de SUV blanca en la costa",
  },
];
const questions = [
  [
    "¿Cómo encuentro un auto?",
    "Entra al catálogo y filtra por marca, presupuesto, año o tipo de auto. Cada publicación reúne fotos y características para ayudarte a elegir.",
  ],
  [
    "¿Puedo comparar mis opciones?",
    "Sí. Desde la ficha de cada auto puedes agregarlo al comparador. Elige entre dos y cuatro vehículos y revisa sus diferencias lado a lado.",
  ],
  [
    "¿Cómo publico mi auto?",
    "Ingresa con una cuenta habilitada como vendedor y completa los ocho pasos. Puedes guardar el borrador y continuar después. La publicación pasa por revisión antes de aparecer en el catálogo.",
  ],
  [
    "¿Las imágenes de la portada son autos en venta?",
    "No. Son imágenes editoriales creadas con IA para la campaña. Los autos disponibles se muestran únicamente en las publicaciones del catálogo.",
  ],
];
export default async function Home() {
  let brands: Array<{ slug: string; name: string; count: number }> = [];
  let latest: CatalogCard[] = [];
  let unavailable = false;
  try {
    [brands, latest] = await Promise.all([getBrandsWithCounts(), getLatestPublished(4)]);
  } catch {
    unavailable = true;
  }
  return (
    <>
      <section className="home-hero" aria-labelledby="hero-title">
        <Container className="hero-heading">
          <div>
            <p className="hero-intro">Para quienes disfrutan el camino.</p>
            <h1 id="hero-title">
              Tu próximo auto.
              <br />
              Tu próxima historia.
            </h1>
          </div>
          <div className="hero-aside">
            <p>
              Encuentra el auto que va contigo.{" "}
              <br />
              Explora, compara y elige a tu ritmo.
            </p>
            <a href="#explorar" className="text-link">
              Empieza a explorar <span aria-hidden="true">↗</span>
            </a>
          </div>
        </Container>
        <div className="hero-photo">
          <Image
            src="/images/coastal-coupe.webp"
            alt="Coupé azul en un mirador del Pacífico; imagen editorial generada con IA"
            fill
            sizes="100vw"
            preload
            className="object-cover"
          />
          <div className="hero-photo-caption">
            <span>El camino empieza contigo.</span>
            <span>Concepto editorial · IA</span>
          </div>
        </div>
        <Container className="hero-search-wrap">
          <HomeSearch brands={brands} />
        </Container>
      </section>
      <Container className="home-benefits">
        <div>
          <span className="benefit-symbol" aria-hidden="true">
            ⌕
          </span>
          <p>
            <strong>Encuentra tu estilo</strong>
            <span>Filtra por lo que más te importa.</span>
          </p>
        </div>
        <div>
          <span className="benefit-symbol" aria-hidden="true">
            ⇄
          </span>
          <p>
            <strong>Decide con perspectiva</strong>
            <span>Compara hasta cuatro autos a la vez.</span>
          </p>
        </div>
        <div>
          <span className="benefit-symbol" aria-hidden="true">
            ♡
          </span>
          <p>
            <strong>Haz tu propia selección</strong>
            <span>Guarda tus favoritos en tu cuenta.</span>
          </p>
        </div>
      </Container>
      <section id="explorar" className="section-space">
        <Container>
          <div className="section-heading">
            <div>
              <p className="section-note">Distintos autos. Tu misma pasión.</p>
              <h2>¿Qué te mueve?</h2>
            </div>
            <Link href="/cars" className="text-link">
              Explorar catálogo <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="collection-grid">
            {collections.map((item) => (
              <Link href={item.href} key={item.text} className="collection-card">
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 700px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="collection-copy">
                  <span>{item.text}</span>
                  <h3>{item.title}</h3>
                </div>
                <span className="collection-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
          <div className="category-links" aria-label="Más categorías">
            <span>También puedes explorar</span>
            <Link href="/cars?body=SEDAN">Sedanes</Link>
            <Link href="/cars?fuel=ELECTRIC">Eléctricos</Link>
            <Link href="/cars?body=PICKUP">Pickups</Link>
            <Link href="/cars?fuel=HYBRID">Híbridos</Link>
          </div>
          <p className="image-disclosure">
            Imágenes de campaña generadas con IA. No representan vehículos anunciados.
          </p>
        </Container>
      </section>
      <section className="section-space inventory-section">
        <Container>
          <div className="section-heading">
            <div>
              <p className="section-note">Un nuevo comienzo, sobre ruedas.</p>
              <h2>Recién llegados.</h2>
            </div>
            <Link href="/cars?sort=newest" className="text-link">
              Ver publicaciones <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {latest.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {latest.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          ) : (
            <div className="inventory-empty">
              <div className="inventory-empty-icon" aria-hidden="true">
                ⌁
              </div>
              <div>
                <h3>
                  {unavailable
                    ? "El catálogo está tomando una pausa."
                    : "Las próximas historias están por llegar."}
                </h3>
                <p>
                  {unavailable
                    ? "No podemos consultar las publicaciones en este momento. Inténtalo de nuevo más tarde."
                    : "Todavía no hay autos publicados. Puedes conocer cómo funciona la plataforma mientras llegan."}
                </p>
              </div>
              <Link href={unavailable ? "/cars" : "/como-funciona"} className="button-outline">
                {unavailable ? "Consultar catálogo" : "Cómo funciona"}
              </Link>
            </div>
          )}
          {brands.length > 0 && (
            <div className="brand-links">
              <span>Encuentra tu marca</span>
              {brands.map((b) => (
                <Link href={`/cars?brand=${b.slug}`} key={b.slug}>
                  {b.name}
                  <small>{b.count}</small>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>
      <section className="section-space">
        <Container>
          <div className="sell-feature">
            <div className="sell-copy">
              <p>Deja espacio para lo que viene.</p>
              <h2>
                Tu auto tiene
                <br />
                más historias
                <br />
                por recorrer.
              </h2>
              <p>
                Crea tu publicación paso a paso. Agrega sus detalles, muestra sus mejores ángulos y
                envíala a revisión.
              </p>
              <Link href="/sell" className="button-light">
                Quiero vender mi auto <span aria-hidden="true">↗</span>
              </Link>
              <span className="sell-note">Necesitas una cuenta habilitada para vender.</span>
            </div>
            <div className="sell-image">
              <Image
                src="/images/baja-suv.webp"
                alt="SUV de concepto en la costa, imagen editorial generada con IA"
                fill
                sizes="(max-width: 700px) 100vw, 55vw"
                className="object-cover"
              />
              <span>Concepto editorial · IA</span>
            </div>
          </div>
        </Container>
      </section>
      <section className="section-space faq-section">
        <Container>
          <div className="faq-layout">
            <div>
              <p className="section-note">Antes de arrancar.</p>
              <h2>
                Vamos paso
                <br />a paso.
              </h2>
              <Link href="/como-funciona" className="text-link">
                Conoce ApexDrive <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="faq-list">
              {questions.map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

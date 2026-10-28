import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Brand } from "./Brand";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-top">
          <div>
            <Link href="/" aria-label="ApexDrive, inicio">
              <Brand />
            </Link>
            <p>
              El próximo capítulo <br />
              empieza en el camino.
            </p>
          </div>
          <nav aria-label="Explora">
            <h2>Encuentra tu camino</h2>
            <Link href="/cars">Catálogo de autos</Link>
            <Link href="/compare">Compara tus opciones</Link>
            <Link href="/sell">Vende tu auto</Link>
          </nav>
          <nav aria-label="Tu espacio">
            <h2>ApexDrive contigo</h2>
            <Link href="/dashboard">Mi cuenta y favoritos</Link>
            <Link href="/como-funciona">Cómo funciona</Link>
            <Link href="/login">Iniciar sesión</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} ApexDrive</span>
          <span>Hecho para los caminos de México.</span>
          <span>Precios del catálogo en MXN.</span>
        </div>
      </Container>
    </footer>
  );
}

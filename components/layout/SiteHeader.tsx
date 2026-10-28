"use client";
// Mobile disclosure and current-route navigation need browser state.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Brand } from "./Brand";
const links = [
  { href: "/cars", label: "Encuentra tu auto" },
  { href: "/compare", label: "Comparar" },
  { href: "/como-funciona", label: "Cómo funciona" },
];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <Container>
        <nav aria-label="Principal" className="main-nav">
          <Link href="/" aria-label="ApexDrive, inicio" onClick={() => setOpen(false)}>
            <Brand />
          </Link>
          <div className="desktop-nav">
            {links.map((link) => (
              <Link
                href={link.href}
                key={link.href}
                aria-current={path.startsWith(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="nav-actions">
            <Link className="account-link" href="/dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 22v-2a8 8 0 0 1 16 0v2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              Mi cuenta
            </Link>
            <Link href="/sell" className="button-primary nav-sell">
              Vende tu auto
            </Link>
            <button
              ref={toggle}
              className="menu-toggle"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setOpen(!open)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d={open ? "m6 6 12 12M6 18 18 6" : "M3 7h18M3 12h18M3 17h18"}
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
          </div>
        </nav>
        <nav id="mobile-menu" aria-label="Navegación móvil" className="mobile-nav" hidden={!open}>
          {[
            ...links,
            { href: "/dashboard", label: "Mi cuenta" },
            { href: "/sell", label: "Vende tu auto" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={path.startsWith(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}

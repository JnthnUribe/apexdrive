import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const geistSans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ApexDrive — Compra y vende autos",
    template: "%s · ApexDrive",
  },
  description:
    "Tu próximo auto. Tu próxima historia. Explora autos en México, compara tus opciones y guarda tus favoritos en ApexDrive.",
  metadataBase: new URL(process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"),
  twitter: {
    card: "summary_large_image",
    title: "ApexDrive — Compra y vende autos",
    images: ["/images/coastal-coupe.webp"],
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "ApexDrive",
    images: [
      {
        url: "/images/coastal-coupe.webp",
        width: 1774,
        height: 887,
        alt: "ApexDrive: tu próxima historia. Imagen editorial IA.",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-ink">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="contenido" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

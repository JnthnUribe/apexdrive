import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Contenedor de ancho máximo del sistema (1440px, gutters fluidos). */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

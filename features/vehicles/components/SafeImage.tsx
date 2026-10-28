"use client";
// Cliente por onError nativo: ante URL rota (fotos por URL de usuarios),
// muestra el placeholder en vez del icono de imagen rota.

import { useState } from "react";
import { VehiclePlaceholder } from "@/features/vehicles/components/VehiclePlaceholder";

export function SafeImage({
  src,
  alt,
  className,
  eager,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={className ?? "h-full w-full"}>
        <VehiclePlaceholder title={alt} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={className ?? "h-full w-full object-cover"}
    />
  );
}

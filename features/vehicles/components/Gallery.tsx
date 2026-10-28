"use client";
// Cliente por selección de foto (estado local). Thumbnails son <button>
// nativos: teclado y lector incluidos sin ARIA extra.

import { useState } from "react";
import { cn } from "@/lib/cn";
import { SafeImage } from "./SafeImage";
import { VehiclePlaceholder } from "./VehiclePlaceholder";

export type GalleryImage = { r2Key: string; width: number | null; height: number | null };

export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-line">
        <VehiclePlaceholder title={title} />
      </div>
    );
  }
  const current = images[index] ?? images[0]!;
  return (
    <div>
      <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-neutral-100">
        <SafeImage src={current.r2Key} alt={`${title} — foto ${index + 1}`} eager />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2" role="group" aria-label="Miniaturas">
          {images.map((img, i) => (
            <button
              key={img.r2Key}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                "aspect-[16/9] overflow-hidden rounded-lg border-2",
                i === index ? "border-ink" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <SafeImage src={img.r2Key} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

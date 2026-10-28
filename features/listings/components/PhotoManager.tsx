import { AddPhotoForm } from "./AddPhotoForm";
import { DeletePhotoButton } from "./DeletePhotoButton";
import { SafeImage } from "@/features/vehicles/components/SafeImage";

type Photo = { id: string; r2Key: string };

/** Paso 5 (Server): galería actual + alta por URL. Borrado con confirmación. */
export function PhotoManager({ draftId, images }: { draftId: string; images: Photo[] }) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      {images.length === 0 ? (
        <p className="max-w-2xl rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Sin fotografías todavía. Agrega al menos 1 para poder publicar.
        </p>
      ) : (
        <ul className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="relative aspect-[16/9] overflow-hidden rounded-xl border border-line bg-neutral-100">
              <SafeImage src={img.r2Key} alt={`Foto ${i + 1} del borrador`} />
              {i === 0 ? (
                <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
                  Principal
                </span>
              ) : null}
              <DeletePhotoButton draftId={draftId} photoId={img.id} />
            </li>
          ))}
        </ul>
      )}
      <AddPhotoForm draftId={draftId} count={images.length} />
    </div>
  );
}

import Link from "next/link";
import { STEP_NAMES, editableSteps } from "@/features/listings/transitions";
import type { ListingStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

/** Progreso del wizard (Server). Enlaza todos los pasos; los no editables
 *  muestran aviso honesto en su página en vez de formulario falso. */
export function WizardNav({
  draftId,
  current,
  status,
}: {
  draftId: string;
  current: number;
  status: ListingStatus;
}) {
  const editable = editableSteps(status);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Progreso de publicación">
      {Object.entries(STEP_NAMES).map(([n, name]) => {
        const step = Number(n);
        const canEdit = editable.includes(step) || step >= 7;
        return (
          <li key={n}>
            <Link
              href={`/sell/${draftId}/step/${step}`}
              aria-current={step === current ? "step" : undefined}
              className={cn(
                "inline-block rounded-full border px-4 py-2 text-sm font-medium",
                step === current
                  ? "border-ink bg-ink text-white"
                  : canEdit
                    ? "border-line hover:bg-ink/5"
                    : "cursor-not-allowed border-line text-muted opacity-60",
              )}
            >
              {step}. {name}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

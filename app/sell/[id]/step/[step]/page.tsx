import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { requireFreshUser } from "@/lib/authz";
import { formatMXN } from "@/lib/format";
import { ownedDraft } from "@/features/listings/drafts";
import { getBrandsWithModels } from "@/features/listings/queries";
import { assertPublishable } from "@/features/listings/schema";
import { STEP_NAMES, editableSteps } from "@/features/listings/transitions";
import { DraftStepForm } from "@/features/listings/components/DraftStepForm";
import { PhotoManager } from "@/features/listings/components/PhotoManager";
import { SubmitReviewForm } from "@/features/listings/components/SubmitReviewForm";
import { WizardNav } from "@/features/listings/components/WizardNav";

export const metadata: Metadata = { title: "Publicar" };

const selectClass =
  "rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-ink";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium";

function Locked({ status }: { status: string }) {
  return (
    <div className="mt-6 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <p className="font-semibold text-amber-900">Paso bloqueado en estado {status}.</p>
      <p className="mt-1 text-sm text-amber-800">
        Solo se editan pasos permitidos por el estado actual de la publicación.
      </p>
      <Link href={`/dashboard/listings`} className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
        Ver mis publicaciones
      </Link>
    </div>
  );
}

export default async function StepPage({
  params,
}: {
  params: Promise<{ id: string; step: string }>;
}) {
  const { id, step: stepRaw } = await params;
  const step = Number(stepRaw);
  if (!Number.isInteger(step) || step < 1 || step > 8) notFound();
  const user = await requireFreshUser();
  let draft;
  try {
    draft = await ownedDraft({ userId: user.id, role: user.role }, id);
  } catch {
    notFound();
  }
  const editable = editableSteps(draft.status).includes(step);
  const nextHref = step < 8 ? `/sell/${draft.id}/step/${step + 1}` : "/dashboard/listings";

  return (
    <Container className="max-w-4xl py-10">
      <p className="text-xs font-semibold tracking-widest text-muted">
        PASO {step} DE 8 · {STEP_NAMES[step]?.toUpperCase()} · {draft.status}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{draft.title}</h1>
      <div className="mt-4">
        <WizardNav draftId={draft.id} current={step} status={draft.status} />
      </div>

      {!editable && step <= 6 ? <Locked status={draft.status} /> : null}

      {step === 1 && editable ? <Step1 draftId={draft.id} draft={draft} /> : null}
      {step === 2 && editable ? <Step2 draftId={draft.id} draft={draft} /> : null}
      {step === 3 && editable ? <Step3 draftId={draft.id} draft={draft} /> : null}
      {step === 4 && editable ? <Step4 draftId={draft.id} draft={draft} /> : null}
      {step === 5 && editable ? <PhotoManager draftId={draft.id} images={draft.images} /> : null}
      {step === 6 && editable ? <Step6 draftId={draft.id} draft={draft} /> : null}
      {step === 7 ? <Preview draftId={draft.id} draft={draft} /> : null}
      {step === 8 ? <Publish draftId={draft.id} draft={draft} /> : null}

      {step <= 6 ? (
        <p className="mt-6">
          <Link href={nextHref} className="text-sm font-semibold underline underline-offset-4">
            {step < 8 ? "Continuar al siguiente paso →" : "Ver mis publicaciones"}
          </Link>
        </p>
      ) : null}
    </Container>
  );
}

type Draft = {
  id: string;
  brand: { slug: string };
  carModel: { slug: string };
  version: string | null;
  year: number;
  condition: "NEW" | "USED" | "CERTIFIED";
  mileageKm: number | null;
  fuel: string | null;
  transmission: string | null;
  bodyType: string | null;
  engine: string | null;
  powerHp: number | null;
  torqueNm: number | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  features: string[];
  city: string | null;
  description: string | null;
  priceMXN: number | null;
  images: Array<{ id: string }>;
};

async function Step1({ draftId, draft }: { draftId: string; draft: Draft }) {
  const brands = await getBrandsWithModels();
  const allModels = brands.flatMap((b) => b.models.map((m) => ({ ...m, brand: b.name })));
  return (
    <DraftStepForm draftId={draftId} step={1}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Marca
          <select name="brandSlug" required defaultValue={draft.brand.slug} className={selectClass}>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Modelo (slug)
          <input
            name="modelSlug"
            required
            maxLength={60}
            defaultValue={draft.carModel.slug}
            list="modelos"
            className={selectClass}
          />
          <datalist id="modelos">
            {allModels.map((m) => (
              <option key={`${m.brand}-${m.slug}`} value={m.slug}>
                {m.brand} {m.name}
              </option>
            ))}
          </datalist>
        </label>
      </div>
      <Input label="Versión (opcional)" name="version" maxLength={60} defaultValue={draft.version ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Año" name="year" type="number" required min={1990} max={new Date().getFullYear() + 1} defaultValue={draft.year} />
        <label className={labelClass}>
          Condición
          <select name="condition" required defaultValue={draft.condition} className={selectClass}>
            <option value="NEW">Nuevo</option>
            <option value="USED">Usado</option>
            <option value="CERTIFIED">Certificado</option>
          </select>
        </label>
      </div>
    </DraftStepForm>
  );
}

function Step2({ draftId, draft }: { draftId: string; draft: Draft }) {
  return (
    <DraftStepForm draftId={draftId} step={2}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Kilometraje" name="mileageKm" type="number" required min={0} max={2000000} defaultValue={draft.mileageKm ?? ""} />
        <label className={labelClass}>
          Combustible
          <select name="fuel" required defaultValue={draft.fuel ?? ""} className={selectClass}>
            <option value="">Elige…</option>
            {["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "CNG"].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Transmisión
          <select name="transmission" required defaultValue={draft.transmission ?? ""} className={selectClass}>
            <option value="">Elige…</option>
            {["MANUAL", "AUTOMATIC", "CVT"].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Carrocería
          <select name="bodyType" required defaultValue={draft.bodyType ?? ""} className={selectClass}>
            <option value="">Elige…</option>
            {["SEDAN", "SUV", "COUPE", "HATCHBACK", "PICKUP", "SPORT", "CONVERTIBLE", "VAN"].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>
      <Input label="Motor (opcional)" name="engine" maxLength={80} defaultValue={draft.engine ?? ""} placeholder="Ej. 2.5L 4 cilindros" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Potencia hp (opcional)" name="powerHp" type="number" min={1} max={2000} defaultValue={draft.powerHp ?? ""} />
        <Input label="Torque Nm (opcional)" name="torqueNm" type="number" min={1} max={5000} defaultValue={draft.torqueNm ?? ""} />
        <Input label="Color exterior (opcional)" name="exteriorColor" maxLength={40} defaultValue={draft.exteriorColor ?? ""} />
        <Input label="Color interior (opcional)" name="interiorColor" maxLength={40} defaultValue={draft.interiorColor ?? ""} />
      </div>
    </DraftStepForm>
  );
}

function Step3({ draftId, draft }: { draftId: string; draft: Draft }) {
  return (
    <DraftStepForm draftId={draftId} step={3}>
      <label className={labelClass}>
        Características (una por línea, máx. 20)
        <textarea
          name="featuresText"
          rows={8}
          maxLength={1200}
          defaultValue={draft.features.join("\n")}
          placeholder={"Aire acondicionado\nPantalla 10”\nCámara de reversa"}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-ink"
        />
      </label>
    </DraftStepForm>
  );
}

function Step4({ draftId, draft }: { draftId: string; draft: Draft }) {
  return (
    <DraftStepForm draftId={draftId} step={4}>
      <Input label="Ciudad" name="city" required maxLength={80} defaultValue={draft.city ?? ""} />
      <label className={labelClass}>
        Descripción (mínimo 50 caracteres)
        <textarea
          name="description"
          required
          rows={6}
          minLength={50}
          maxLength={2000}
          defaultValue={draft.description ?? ""}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-ink"
        />
      </label>
    </DraftStepForm>
  );
}

function Step6({ draftId, draft }: { draftId: string; draft: Draft }) {
  return (
    <DraftStepForm draftId={draftId} step={6} submitLabel="Guardar precio">
      <Input
        label="Precio (MXN)"
        name="priceMXN"
        type="number"
        required
        min={50000}
        max={50000000}
        step={1000}
        defaultValue={draft.priceMXN ?? ""}
        hint={draft.priceMXN ? `Actual: ${formatMXN(draft.priceMXN)}` : "Entre $50,000 y $50,000,000."}
      />
    </DraftStepForm>
  );
}

function Preview({ draft }: { draftId: string; draft: Draft & { status: string } }) {
  const missing = assertPublishable({
    brandId: "x",
    carModelId: "x",
    year: draft.year,
    condition: draft.condition,
    mileageKm: draft.mileageKm,
    fuel: draft.fuel,
    transmission: draft.transmission,
    bodyType: draft.bodyType,
    city: draft.city,
    description: draft.description,
    priceMXN: draft.priceMXN,
    photoCount: draft.images.length,
  });
  return (
    <div className="mt-6 max-w-2xl">
      <dl className="overflow-hidden rounded-2xl border border-line text-sm">
        {[
          ["Versión", draft.version ?? "—"],
          ["Año", String(draft.year)],
          ["Kilometraje", draft.mileageKm !== null ? `${draft.mileageKm.toLocaleString("es-MX")} km` : "—"],
          ["Precio", draft.priceMXN ? formatMXN(draft.priceMXN) : "—"],
          ["Ubicación", draft.city ?? "—"],
          ["Fotos", `${draft.images.length}`],
          ["Características", `${draft.features.length}`],
        ].map(([k, v]) => (
          <div key={k} className="grid grid-cols-2 gap-2 border-b border-line px-4 py-2.5 last:border-0 odd:bg-neutral-50">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {missing.length > 0 ? (
        <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Falta completar:</p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p role="status" className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
          Borrador completo. Continúa a publicación.
        </p>
      )}
    </div>
  );
}

function Publish({ draftId, draft }: { draftId: string; draft: Draft & { status: string } }) {
  if (draft.status === "PENDING") {
    return (
      <p role="status" className="mt-6 max-w-2xl rounded-2xl bg-neutral-100 p-6 text-sm">
        Ya está en revisión. Te avisaremos cuando se publique. Puedes retirarla a borrador desde Mis publicaciones.
      </p>
    );
  }
  if (draft.status === "PUBLISHED") {
    return (
      <p role="status" className="mt-6 max-w-2xl rounded-2xl bg-green-50 p-6 text-sm text-green-800">
        Esta publicación ya está visible en el catálogo.
      </p>
    );
  }
  if (draft.status !== "DRAFT" && draft.status !== "REJECTED") {
    return (
      <p className="mt-6 max-w-2xl rounded-2xl border border-line p-6 text-sm text-muted">
        En estado {draft.status} no se puede enviar a revisión.
      </p>
    );
  }
  return <SubmitReviewForm draftId={draftId} />;
}

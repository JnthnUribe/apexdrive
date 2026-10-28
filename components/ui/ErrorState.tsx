import Link from "next/link";

/** Error recuperable de una sección con datos (requiere requestId del AppError). */
export function ErrorState({
  title,
  message,
  requestId,
  retryHref,
}: {
  title: string;
  message: string;
  requestId?: string;
  retryHref?: string;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <h2 className="font-bold text-red-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-red-800">{message}</p>
      {requestId ? (
        <p className="mt-2 break-all text-xs text-red-700">
          Referencia: <code>{requestId}</code>
        </p>
      ) : null}
      {retryHref ? (
        <Link
          href={retryHref}
          className="mt-4 inline-block rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Reintentar
        </Link>
      ) : null}
    </div>
  );
}

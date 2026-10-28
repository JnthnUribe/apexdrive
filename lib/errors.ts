// requestId único por error. Usa WebCrypto global (Edge + Node),
// nunca node:crypto directo: este módulo también se importa en el borde.

// Error de aplicación: único formato hacia el usuario.
// - `code`: HTTP equivalente. `message`: seguro para mostrar.
// - `cause`: detalle interno, solo va a logs. Jamás stack traces al cliente.

export const ERROR_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId: string;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown; requestId?: string }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.requestId = options?.requestId ?? crypto.randomUUID();
    this.cause = options?.cause;
  }

  /** Cuerpo JSON seguro para el cliente. */
  toPublic(): { error: { code: ErrorCode; message: string; requestId: string } } {
    return { error: { code: this.code, message: this.message, requestId: this.requestId } };
  }
}

export function fromUnknown(err: unknown, requestId?: string): AppError {
  if (err instanceof AppError) return err;
  return new AppError("INTERNAL", "Ocurrió un error inesperado.", {
    cause: err,
    requestId,
  });
}

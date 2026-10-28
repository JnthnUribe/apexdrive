import pino from "pino";

// Logger JSON a stdout (producción) / pretty en desarrollo.
// Secretos redactados por ruta. requestId correlaciona log ↔ respuesta al usuario.

export const logger = pino({
  level: process.env["LOG_LEVEL"] ?? (process.env["NODE_ENV"] === "production" ? "info" : "debug"),
  redact: {
    paths: [
      "password",
      "passwordHash",
      "access_token",
      "refresh_token",
      "DATABASE_URL",
      "AUTH_SECRET",
      "R2_SECRET_ACCESS_KEY",
    ],
    censor: "[REDACTED]",
  },
  transport:
    process.env["NODE_ENV"] === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});

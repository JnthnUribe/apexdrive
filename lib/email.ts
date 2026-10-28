import nodemailer from "nodemailer";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// Envío de correo transaccional (Fase 2: solo recuperación de contraseña).
// - Sin SMTP configurado + producción → AppError UNAVAILABLE (nunca finge envío).
// - Sin SMTP + desarrollo → loguea el enlace (flujo completo testeable sin MTA).
// Proveedor real: cualquier SMTP (Fase 9 puede migrar a Resend/SES sin cambiar llamadas).

function smtpConfig(): {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
} | null {
  const host = process.env["SMTP_HOST"];
  if (!host) return null;
  return {
    host,
    port: Number(process.env["SMTP_PORT"] ?? "587"),
    user: process.env["SMTP_USER"],
    pass: process.env["SMTP_PASS"],
    from: process.env["SMTP_FROM"] ?? "ApexDrive <no-reply@apexdrive.mx>",
  };
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<{ delivered: boolean }> {
  const cfg = smtpConfig();
  if (!cfg) {
    if (process.env["NODE_ENV"] === "production") {
      throw new AppError("UNAVAILABLE", "Servicio de correo no configurado. Contacta soporte.");
    }
    logger.info({ to, resetLink }, "email dev: enlace de recuperación (sin SMTP)");
    return { delivered: false };
  }
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  await transport.sendMail({
    from: cfg.from,
    to,
    subject: "Recupera tu contraseña de ApexDrive",
    text: `Solicitaste recuperar tu contraseña. Usa este enlace (válido 1 hora, un solo uso):\n\n${resetLink}\n\nSi no fuiste tú, ignora este mensaje.`,
  });
  return { delivered: true };
}

import { z } from "zod";

// Schemas de autenticación y perfil. Misma fuente para feedback inline (cliente)
// y enforcement real (servidor). Reglas de seguridad:
// - Email siempre normalizado (trim + minúsculas) antes de comparar/almacenar.
// - Política de contraseña (12+, letra+número, máx 72 por límite bcrypt) SOLO en registro/reset.
// - Login acepta cualquier string no vacío: no filtrar información de política.
// - Rol jamás aceptado desde el cliente: el servidor fuerza USER.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(160, "Correo demasiado largo.")
  .pipe(z.string().email("Correo inválido."));

const newPassword = z
  .string()
  .min(12, "Mínimo 12 caracteres.")
  .max(72, "Máximo 72 caracteres.")
  .refine((v) => /[a-zA-Záéíóúñ]/u.test(v) && /\d/u.test(v), "Debe incluir letras y números.");

export const registerSchema = z.object({
  email,
  password: newPassword,
  displayName: z.string().trim().min(2, "Nombre muy corto.").max(60, "Nombre muy largo."),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Contraseña requerida.").max(72),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z.object({
  token: z.string().min(1, "Token requerido.").max(128),
  password: newPassword,
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Nombre muy corto.").max(60, "Nombre muy largo."),
  phone: z
    .string()
    .trim()
    .max(20, "Teléfono muy largo.")
    .refine((v) => v === "" || /^[+\d][\d\s-]{6,19}$/.test(v), "Teléfono inválido.")
    .optional(),
  city: z.string().trim().max(80, "Ciudad muy larga.").optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

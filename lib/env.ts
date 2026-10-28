import { z } from "zod";

// Validación centralizada de variables de entorno.
// - parseEnv() es pura y testeable; los consumidores validan donde la necesitan.
// - Nada se valida en import: el arranque degradado sin DB debe seguir vivo.

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL requerida"),
  AUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

export function parseEnv(input: Record<string, string | undefined>): {
  server: ServerEnv;
  client: ClientEnv;
} {
  const server = serverSchema.parse({
    DATABASE_URL: input["DATABASE_URL"],
    AUTH_SECRET: input["AUTH_SECRET"],
    GOOGLE_CLIENT_ID: input["GOOGLE_CLIENT_ID"],
    GOOGLE_CLIENT_SECRET: input["GOOGLE_CLIENT_SECRET"],
    R2_ACCOUNT_ID: input["R2_ACCOUNT_ID"],
    R2_ACCESS_KEY_ID: input["R2_ACCESS_KEY_ID"],
    R2_SECRET_ACCESS_KEY: input["R2_SECRET_ACCESS_KEY"],
    R2_BUCKET: input["R2_BUCKET"],
    R2_PUBLIC_URL: input["R2_PUBLIC_URL"],
    NODE_ENV: input["NODE_ENV"],
  });
  const client = clientSchema.parse({
    NEXT_PUBLIC_APP_URL: input["NEXT_PUBLIC_APP_URL"],
  });
  return { server, client };
}

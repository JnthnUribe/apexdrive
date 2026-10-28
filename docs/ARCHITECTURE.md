# ApexDrive — Arquitectura

## Diagrama

```
Browser ── HTML/RSC (SEO) + islas cliente ──► Next.js 16 (standalone, :3000)
  Server Actions (mutaciones: authN→authZ→Zod→rate-limit→Prisma→revalidate)
  Route Handlers (/api/healthz, /api/auth/*, sitemap, robots)
        │
        ├─ PostgreSQL 16 (Prisma 6, migraciones versionadas 0001–0005)
        ├─ Auth.js v5 (JWT firmados + Google OAuth, roles en token + DB)
        └─ (Fase 8) R2 para imágenes · (Fase 9) Redis para rate-limit
```

## Capas y reglas

- **Server-first**: data-fetching en Server Components; `"use client"` solo con
  estado/efectos del navegador (cada isla lo documenta en comentario).
- **Slices verticales** `features/<dominio>/` (`schema|queries|actions|components`);
  compartido real en `components/ui/` y `lib/`. Nada de capas horizontales.
- **Mutaciones** solo vía Server Actions con pipeline fijo; API routes solo para
  lo que Actions no pueden (OAuth callbacks, healthz, sitemap).
- **Errores**: `AppError` (código HTTP + mensaje público + `requestId`); causa
  interna solo a logs Pino (secretos redactados). Nunca stacks al cliente.
- **AuthZ**: rol desde DB (`requireFreshUser`) en cada Action sensible; ownership
  en el `WHERE` (IDOR imposible por construcción); `tokenVersion` revoca JWTs.
- **Decisiones puras testeables**: `lib/guards.ts` (Edge-safe), `related.ts`,
  `catalogFilters.ts`, `lib/seo.ts` — sin I/O, con unit tests.

## Datos

14 modelos, 9 enums. Invariantes clave: slug único; `Favorite` única por
usuario+listing; `ComparisonItem` único; posición de foto única por listing;
reporte OPEN único por usuario+listing (índice parcial 0005); CHECKs de rango;
borrado publicado → `ARCHIVED` (soft); auditoría `AdminAction` append-only.
Ver `prisma/schema.prisma` y `prisma/migrations/`.

## Imágenes (estado actual)

Vectores propios + URLs https validadas (allowlist de extensión, máx 12) con
`SafeImage` (fallback ante URL rota). Subida directa R2 en Fase 8.

## Observabilidad

Pino JSON a stdout, `requestId` correlacionado, `/api/healthz` (ok/degraded/503),
cabeceras de seguridad globales. Métricas/Alertas: ver `docs/DEPLOYMENT.md`.

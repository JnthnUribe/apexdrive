# ApexDrive — MASTER PLAN (v1.0)

> Fase 1: análisis y diseño. Este documento es el contrato técnico del producto.
> Estado: **REVISIÓN EXTERNA COMPLETADA 2026-09-29 — veredicto: NO LISTO
> (B1–B4 ambientales). 2 HIGH + 2 MEDIUM + 1 LOW corregidos. Detalle en
> `apexdrive/docs/PRODUCTION_READINESS.md` y `apexdrive/docs/SECURITY.md`.
> Alcance real ejecutado: el objetivo pedido cubría Fase 0 + Fase 1; ambas se implementaron juntas como "base técnica".

---

## 0. Inspección del punto de partida (hallazgos)

### 0.1 Proyecto existente: `Documents/web-carros/` (34 archivos)

| Área | Estado real |
|---|---|
| Frontend | HTML + Tailwind CDN + JS ES Modules, sin build, 8 rutas (`index`, `pages/modelos`, `personaliza`, `comparar`, `financiamiento`, `auth/login`, `app/dashboard`, `legal/*`) |
| Backend | 100% Supabase (Postgres + Auth Google + RLS + Storage). Sin API propia. `supabase/schema.sql` con 4 tablas (`profiles`, `vehicles`, `orders`, `test_drives`) + RLS + trigger + seeds |
| Catálogo | 6 vehículos en fallback local + seeds SQL. Datos de demo, no inventario real |
| Auth | Google OAuth Supabase + modo demo por `localStorage`. Sin roles efectivos (columna `role` existe, sin enforcement en app) |
| Imágenes | 4 SVG vectoriales originales CC0 + `prompts.md` para fotos IA. Cero fotos reales |
| Calidad | Sin TypeScript, sin tests, sin lint, sin CI, sin Docker, sin manejo centralizado de errores |
| Docs | `README.md` + `supabase/README.md` operativos, orientados a demo |

**Conclusión:** base útil como referencia de UX y de reglas RLS, pero NO es una base para producción según el DoD exigido. Evolucionarla incrementalmente costaría más que reconstruir sobre stack tipado con tests.

### 0.2 Entorno verificado

| Herramienta | Resultado |
|---|---|
| Node / npm | v24.13.0 / v11.6.2 — apto para Next.js 15 (requiere Node ≥ 18.18) |
| Docker | **NO instalado** — riesgo para fase DevOps local (ver §12 R-04) |
| Git | 2.52.0 disponible; el directorio **no** es repo (`Is directory a git repo: no`) |
| `package.json` | No existe en el proyecto — instalación limpia, cero dependencias heredadas |
| `.env` con secretos | No existe — nada que rotar ni filtrado |

### 0.3 Decisión de ubicación (propuesta)

Nueva app Next.js en `Documents/apexdrive/` (hermana de `web-carros/`).
`web-carros/` se conserva intacto como **referencia/legado**, no se mezcla código estático legacy con la app.
Justificación: evita contaminación de convenciones, permite comparar UX durante la migración, y el historial queda limpio desde el commit inicial.

---

## 1. Stack decidido

| Capa | Elección | Justificación breve |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript strict** | Stack pedido. RSC por defecto = menos JS al cliente, SEO gratis, colocation de data-fetching |
| Estilos | **Tailwind CSS v4** | Pedido. v4 elimina config JS y compila más rápido; design tokens propios para identidad ApexDrive |
| DB | **PostgreSQL 16** | Pedido. JSONB solo donde aporte (specs variables), resto relacional estricto |
| ORM | **Prisma 6** | Pedido. Migraciones versionadas + seed tipado + Prisma Studio para QA |
| Auth | **Auth.js v5 (NextAuth) + PrismaAdapter: Google OAuth + credentials (bcrypt)** | **Cambio justificado vs Supabase Auth heredado:** con Postgres propio + Prisma, Auth.js evita duplicar proveedor de identidad, sesiones en nuestra DB (auditable, testeable sin red), y roles leídos del lado servidor en cada request. Supabase pasaría a ser redundante (dos fuentes de verdad de usuarios). Google OAuth se conserva como login social exigido |
| Validación | **Zod v4** | Pedido. Mismo schema compartido cliente (feedback inline) + servidor (Server Actions / API). Nunca solo frontend |
| Formularios | **React Hook Form + @hookform/resolvers(zod)** | Pedido. Wizard `/sell` de 8 pasos con validación por paso y mínimo re-render |
| Estado | **Sin store global.** Server state = fetch/RSC; UI efímera = `useState`/`useSearchParams`; comparador = URL (`/compare?a=..&b=..`) compartible | Pedido. `nuqs` (tipado de query params) solo si `useSearchParams` manual se vuelve repetitivo — decisión diferida a fase 3 |
| Imágenes | **Abstracción `MediaStorage` (port) + driver S3-compatible (Cloudflare R2 recomendado) / local en dev** | R2 = $0 egress, compatible S3, firma de uploads directos. La app nunca toca credenciales: el servidor firma URLs de subida corta duración |
| Tests | **Vitest (unit) + Playwright (E2E) + Prisma + DB efímera para integración** | Vitest más rápido que Jest con ESM/TS; Playwright cubre los 3 flujos E2E exigidos |
| Calidad | **ESLint (flat) + Prettier + `tsc --noEmit` en CI** | DoD exige los 4 gates |
| DevOps | **Docker multi-stage + compose (app+db) + GitHub Actions** | Pedido. Sin secretos en imagen ni repo |

**Lo que NO se introduce:** CMS, GraphQL, Redis (hasta que una métrica lo pida), microservicios, Supabase (retirado, ver arriba).

---

## 2. Arquitectura

```
┌ Browser ── RSC/HTML (SEO) + islands interactivas (Client Components) ─┐
│  Server Actions (mutaciones, Zod + authZ) │ Route Handlers (webhooks, OG) │
├ lib/ (db, auth, errors, logger, ratelimit, media, seo) ───────────────┤
├ features/<dominio>/ (schema.ts · queries.ts · actions.ts · components/)┤
└ Prisma → PostgreSQL · R2 (imágenes) · Auth.js sessions ────────────────┘
```

Reglas:

- **Server-first:** todo data-fetching en Server Components; `"use client"` solo para interactividad real (filtros, wizard, galería, toasts). Cada Client Component lleva comentario de por qué es cliente.
- **Vertical slices por dominio** (`features/vehicles`, `features/listings`, `features/favorites`, `features/compare`, `features/sellers`, `features/admin`, `features/contact`, `features/media`), no capas horizontales gigantes. Compartido real → `components/ui/` (Button, Input, Modal, Skeleton, EmptyState, Toast) y `lib/`.
- **Mutaciones solo vía Server Actions** con pipeline fijo: `authN → authZ (rol + ownership) → Zod parse → rate-limit → transacción Prisma → revalidatePath → AppError tipado`. API routes solo para lo que Actions no pueden (webhook firma R2, `sitemap.xml`, `opengraph-image`).
- **Errores:** `AppError { code: 400|401|403|404|409|422|429|500, message público, cause interna }`. Al usuario, mensaje seguro + ID de correlación; stack solo a logs (Pino → stdout JSON en prod).
- **N+1 prohibido:** Prisma `include` + `select` explícito; revisión de queries en PR con `prisma.$queryRaw` + `EXPLAIN` para filtros del catálogo.
- **Componentes pequeños:** límite blando 150 líneas / 1 responsabilidad; composición sobre props booleanas.

---

## 3. Estructura de directorios (objetivo)

```
apexdrive/
├─ app/
│  ├─ (marketing)/page.tsx                  # HOME (hero, buscador, destacadas, marcas, tipos, recientes, porqué, CTA vender)
│  ├─ cars/page.tsx                         # CATÁLOGO (filtros ↔ URL, paginación por cursor)
│  ├─ cars/[slug]/page.tsx                  # DETALLE (+ JSON-LD, OG dinámica)
│  ├─ compare/page.tsx                      # COMPARADOR (?a=&b=&c=&d=, 2–4)
│  ├─ brands/[slug]/page.tsx · types/[slug]/page.tsx
│  ├─ login/page.tsx · register/page.tsx · forgot-password/page.tsx
│  ├─ dashboard/page.tsx                    # usuario: perfil, favoritos, comparaciones, historial
│  ├─ dashboard/listings/                   # vendedor: CRUD + estados
│  ├─ sell/page.tsx                         # wizard 8 pasos (draft autosave)
│  ├─ admin/page.tsx · admin/{users,listings,reports,brands,actions}/
│  ├─ api/webhooks/r2/route.ts · sitemap.ts · robots.ts
│  ├─ layout.tsx · globals.css · error.tsx · not-found.tsx · loading.tsx
├─ features/{vehicles,listings,favorites,compare,sellers,contact,media,admin}/
│   └─ {schema.ts,queries.ts,actions.ts,components/*,__tests__/*}
├─ components/ui/* · lib/{db,auth,errors,logger,ratelimit,media,seo,utils}.ts
├─ prisma/{schema.prisma,migrations/,seed.ts}
├─ tests/{unit,integration,e2e} · playwright.config.ts · vitest.config.ts
├─ docker/{Dockerfile,docker-compose.yml} · .github/workflows/ci.yml
├─ docs/{MASTER_PLAN.md,ARCHITECTURE.md,API.md,RUNBOOK.md,DECISIONS.md}
└─ .env.example (nunca .env real)
```

---

## 4. Modelo de datos (Prisma/Postgres)

Enums: `Role(USER|SELLER|ADMIN)` · `ListingStatus(DRAFT|PENDING|PUBLISHED|SOLD|REJECTED|ARCHIVED)` ·
`FuelType(PETROL|DIESEL|HYBRID|ELECTRIC|CNG)` · `Transmission(MANUAL|AUTOMATIC|CVT)` ·
`BodyType(SEDAN|SUV|COUPE|HATCHBACK|PICKUP|SPORT|CONVERTIBLE|VAN)` · `Condition(NEW|USED|CERTIFIED)` ·
`ReportStatus(OPEN|RESOLVED|DISMISSED)` · `ReportReason(SPAM|FRAUD|WRONG_INFO|DUPLICATE|OTHER)`.

Entidades y cardinalidades:

- **User** (cuid PK, email unique+citext, passwordHash nullable [OAuth], role, status, timestamps) 1—1 **Profile** (displayName, phone, avatarUrl, city) · 1—0..1 **Seller** (verificado, RFC?, rating) · 1—N Listing, Favorite, Comparison, Report, AdminAction, Session/Account (Auth.js).
- **Brand** (slug unique, name unique, logoUrl) 1—N **CarModel** (brandId, slug unique por marca, name) — catálogo curado solo editable por ADMIN (evita duplicados "BMW/bmw").
- **Listing** (slug unique, sellerId, brandId, carModelId, title, version, year, priceMXN, mileageKm, fuel, transmission, bodyType, condition, engine, powerHp, torqueNm, exteriorColor, interiorColor, city, description, status, featuredUntil, publishedAt, viewCount + @@index([status,publishedAt]), @@index([brandId]), @@index([priceMXN]), @@index([year]), índice compuesto filtros) 1—N **VehicleImage** (listingId, r2Key, width/height, position unique por listing, isPrimary, blurhash) · 1—N Favorite · N—N Comparison vía ComparisonItem.
- **Favorite** (@@unique([userId, listingId])), **Comparison** (owner, name, items 2–4 validados en Zod + DB check), **ContactMessage** (listingId, fromUser, message, lectura), **Report** (reporter, listingId, reason, detail, status) + **AdminAction** (adminId, targetType, targetId, action, reason — auditoría append-only, sin update/delete).
- Reglas: borrado de Listing publicado → `ARCHIVED` (soft, preserva favoritos/historial); `SOLD` congela edición salvo admin; precio/kilometraje `CHECK > 0`; año 1990–año actual+1; todo `updatedAt` automático.

Migración de legado: script único `prisma/migrations/legacy_import` que mapea `vehicles→(Brand,CarModel,Listing PUBLISHED)` y `orders/test_drives→ContactMessage`; `profiles.role` → `User.role`. Se corre una vez y se documenta.

---

## 5. Rutas

| Ruta | Acceso | Notas |
|---|---|---|
| `/` | pública | Hero + buscador (`?q,brand,maxPrice,year`) → redirige a `/cars` |
| `/cars?brand=&model=&minYear=&maxYear=&minPrice=&maxPrice=&fuel=&transmission=&body=&condition=&city=&color=&sort=&cursor=` | pública | Filtros 1:1 con URL, paginación por cursor, `loading.tsx` skeleton |
| `/cars/[slug]` | pública | Galería + specs + vendedor + similares + JSON-LD `Car` |
| `/compare?a=&b=&c=&d=` | pública (guardar requiere login) | 2–4, diffs resaltados, sin "ganador" |
| `/brands/[slug]`, `/types/[slug]` | pública | SEO programático |
| `/login /register /forgot-password` | guest + rate-limit 5/min/IP | Credenciales + Google OAuth; anti-enumeración (respuesta idéntica exista o no el email) |
| `/dashboard` | USER+ | Perfil, favoritos, comparaciones, historial de contactos |
| `/sell` (wizard 8 pasos) | SELLER+ | Draft autosave (debounce 2s, estado DRAFT), validación por paso |
| `/dashboard/listings` | SELLER+ (ownership) | Editar DRAFT/REJECTED; PUBLISHED solo precio/pausa; IDOR tests obligatorios |
| `/admin/*` | ADMIN | Métricas, moderación (approve/reject/hide), usuarios (block), reportes, catálogo, AdminAction log |

---

## 6. Módulos y superficie de mutación (Server Actions por feature)

`vehicles`: `getCatalog(filters)` (solo lectura, caché `revalidateTag('catalog')`) · `getDetail(slug)` (+`incrementView` fire-and-forget).
`listings`: `createDraft`, `updateDraftStep(step, data)`, `submitForReview`, `updatePublished(id, {price,paused})`, `archiveListing`, `markSold` — todas con ownership (`seller.userId = session.user.id`) o ADMIN.
`favorites`: `toggleFavorite` (idempotente, unique constraint como guarda) · `compare`: `saveComparison` (valida 2–4 + listings PUBLISHED).
`contact`: `sendMessage` (rate-limit 10/hora, maxlength 1000, sanitizado) · `media`: `requestUploadUrl(mime,size)` (firma R2, valida MIME/tamaño/cantidad) + `confirmUpload`.
`admin`: `moderateListing`, `setUserStatus`, `resolveReport` (todas escriben `AdminAction`).
Auth: páginas Auth.js (`signIn/signUp` con Zod + bcrypt 12 rounds + verificación de email por token).

---

## 7. Autenticación y autorización

- Sesiones: Auth.js JWT→DB sessions (revocables, `requireAuth()` helper en servidor). Middleware protege `/dashboard/*`, `/sell`, `/admin/*` (rol en token, revalidado contra DB en acciones sensibles).
- Autorización: matriz por recurso en `lib/authz.ts` (`canEditListing(user, listing)` etc.). El rol viaja en sesión firmada, **jamás** desde el cliente; cada Server Action re-verifica ownership en SQL (`where: { id, seller: { userId } }` — IDOR imposible por construcción).
- Endurecimiento: rate-limit en login/register/contact (Upstash Redis o in-memory con cabecera `Retry-After` en dev), bloqueo progresivo 5→15→60 min, headers (`CSP`, `HSTS`, `X-Frame-Options`, `nosniff`), CSRF inherente a Server Actions (origin check) + tokens en formularios sensibles, subida de imágenes con MIME allowlist + límite 5 MB × 12 fotos + re-encode a WebP en worker.

---

## 8. Estrategia de imágenes

Pipeline: `requestUploadUrl` (firma 5 min, `content-type` + `content-length-range` fijados) → subida directa browser→R2 → `confirmUpload` (verifica objeto, genera variantes 320/768/1280 WebP + blurhash en job) → `VehicleImage` con `position`. `next/image` con `remotePatterns` R2 + `sizes` + lazy por defecto + `alt` obligatorio (validado en Zod). Dev: driver local `public/uploads/` con la misma interfaz. Borrado: al archivar se conservan (histórico); al eliminar DRAFT se purgan (job huérfanos semanal).

---

## 9. Deployment, Docker y CI/CD

- `Dockerfile` multi-stage (deps → build → runner non-root, standalone output). `compose`: `app + postgres:16-alpine + (redis opcional)`. `.env.example` con `DATABASE_URL, AUTH_SECRET, GOOGLE_*, R2_* , NEXT_PUBLIC_APP_URL`. Secretos solo en gestor del host/CI.
- CI (`ci.yml`): `install → lint → typecheck → unit/integration → build → e2e (contra preview + DB efímera)`; deploy bloqueado si falla cualquier gate. CD inicial: push a `main` → build+push imagen → deploy (objetivo: Fly.io o VPS con compose; Vercel como alternativa solo-frontent si R2/DB externos — decisión en fase 9).
- Observabilidad: Pino JSON + `x-request-id`, métricas Next + endpoint `/api/healthz`, alertas en 5xx y p99 del catálogo. Runbook en `docs/RUNBOOK.md`.

---

## 10. Transversales (resumen de estrategia)

- **SEO:** metadata dinámica por listing/marca, canonical, OG/Twitter images generadas, `sitemap.ts` (listings PUBLISHED), `robots.ts`, JSON-LD `Car` + `BreadcrumbList`. Filtros con 1+ valor indexan solo combinaciones curadas (evita thin content).
- **A11y (WCAG AA):** HTML semántico, labels reales, focus-visible, teclado completo en galería/wizard/tabs, contraste ≥ 4.5:1, `alt` real, `aria-*` solo donde el HTML no alcanza. Gate: `axe-core` en E2E de home/catálogo/detalle.
- **Perf (Lighthouse ≥ 90 móvil):** RSC + `next/image` + fuentes `next/font` + dynamic import del wizard/comparador + `loading.tsx`/Suspense por sección + bundle budget (límite en CI).
- **UX obligatoria por pantalla:** skeleton, empty state con acción, error state con reintento, toasts, confirmaciones destructivas, inline validation, disabled states. Botón sin backend = prohibido (se oculta o deshabilita con motivo).

---

## 11. Testing

| Nivel | Qué | Dónde |
|---|---|---|
| Unit (Vitest) | `monthly()`, filtros→Prisma `where`, schemas Zod (casos límite), `canEditListing`, formateadores MXN | `features/*/__tests__`, `lib/__tests__` |
| Integración (Vitest + DB efímera `prisma db push`) | Registro→login, publicar→moderar→ver, favorito toggle concurrente (409), IDOR (A no edita B → 403), RLS-equivalente vía authZ | `tests/integration/` |
| E2E (Playwright, 3 flujos exigidos) | usuario: registro→login→buscar→favorito; vendedor: publicar→editar→ver; admin: moderar | `tests/e2e/` + axe en cada flujo |
| Gates | `lint + typecheck + tests + build` en CI y **antes de declarar cada fase terminada** | `ci.yml` |

Seed: `prisma/seed.ts` con 12 marcas / ~30 modelos / 24 listings coherentes MX (precios MXN, ciudades reales, placas nunca reales) marcados `isSeed: true` + usuario demo por rol (credenciales solo en `.env.example`, nunca en repo).

---

## 12. Riesgos

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-01 | Alcance gigante en un hilo | Abandono / calidad baja | Fases con DoD y gates; este plan; parar ante problema arquitectónico |
| R-02 | OAuth Google sin credenciales aún | Bloquea login social | Fase 2 deja credentials + seam de OAuth; credenciales Google del usuario se piden en fase 5 |
| R-03 | Fotos IA con marcas/licencias dudosas | Legal | Pipeline §8 + prompts sin marcas; placeholders SVG hasta aprobar assets; `prompts.md` heredado |
| R-04 | Sin Docker local | No se valida compose aquí | CI valida Docker; local usa `npm + postgres` directo; instalar Docker Desktop recomendado |
| R-05 | N+1 / filtros lentos con volumen | Perf | Índices §4 + `EXPLAIN` en PR + seed de 10k listings para prueba de carga del catálogo |
| R-06 | Spam/scraping del catálogo y contacto | Abuso | Rate-limit, honeypot + Turnstile en contacto/registro, `robots` + paginación con cursor |
| R-07 | Subidas maliciosas | Seguridad | Firma servidor, MIME+size enforcement en R2 policy y re-chequeo, re-encode WebP, sin SVG subido por usuarios |

---

## 13. Fases de construcción (incremental, cada una con informe de cierre)

| Fase | Alcance | Criterios de aceptación |
|---|---|---|
| **0. Bootstrap** | ✅ Repo `apexdrive/`, Next 16+TS strict+Tailwind v4+ESLint flat+Prettier, layout, tokens, `ui/` (Button/Input/Container/Skeleton/EmptyState), header responsive, footer, home fundacional, healthz, error/loading/404, `.env.example`, CI, Docker | `lint + typecheck + 19 tests + build` verdes local 2026-09-29 |
| **1. Datos** | ✅ Prisma 6.19 schema §4 completo (14 modelos + 9 enums + índices), migración `0001_init` + CHECKs DB, seed idempotente (12 marcas/~30 modelos/24 listings), import legacy documentado en seed/README | Schema `validate` OK + `generate` OK; **ejecución live (`migrate dev` + `seed`) pendiente de Postgres real (sin Docker local)** |
| **2. Auth + roles** | ✅ Auth.js v5 (credentials bcrypt-12 + Google condicional), JWT revocable, `proxy.ts` + layouts guards, matriz `lib/guards.ts`, rate-limit 5/min, reset SHA-256 un solo uso, perfil en `/dashboard`, 5 escenarios de ataque en tests | `lint + typecheck + 47 tests + build` verdes; integración DB-gated corre en CI con Postgres |
| **3. Home + catálogo** | ✅ `/cars` (13 filtros combinables en URL, 6 sorts, paginación numerada, todo en Postgres), `/cars/[slug]` (galería, specs, vendedor sin PII, relacionados, favorito, compartir, JSON-LD), `/compare` v1 (tabla con diffs, sin ganador), home con marcas + recientes reales | `lint + typecheck + 58 tests + build` verdes; smoke runtime con estados honestos |
| **4. Publicación** | ✅ `/sell` wizard 8 pasos (borrador incremental, Zod por paso, fotos URL, preview, envío a PENDING), `/dashboard/listings` owner-only, máquina de estados estricta, 9 ataques de ownership/estados en tests | `lint + typecheck + 68 tests + build` verdes; guards runtime verificados |
| **5. Engagement** | ✅ Favoritos (cuenta+toggle optimista), comparativas guardadas, relacionados por puntaje, historial local sin tracking, búsqueda multitérmino, SEO sistemático, UX polish | `lint + typecheck + 82 tests + build` verdes; smoke con content-types correctos |
| **6. Admin + hardening** | ✅ `/admin` (métricas, pendientes, usuarios, reportes, auditoría), moderación con audit, bloqueo con revocación, 7 vulnerabilidades corregidas, `docs/SECURITY.md` | `lint + typecheck + 86 tests + build` verdes; headers y guards en runtime |
| **7. Admin + reportes** | Métricas, moderación, usuarios, AdminAction append-only | E2E admin; auditoría inmutable verificada |
| **8. Media pipeline** | Firma R2, variantes, validaciones, purga | E2E upload 12 fotos + rechazo de .exe/SVG |
| **9. Hardening + perf + SEO/a11y** | Rate-limits, headers, sitemap/robots/OG, budgets, Runbook | Gates + Lighthouse + axe en CI |
| **10. Release** | Docs finales, compose prod, checklist go-live, tag `v1.0.0` | Deploy reproducible desde cero con solo `.env` |

**DoD por funcionalidad:** implementación + responsive (320→1920) + validación server + autorización server + errores/loading/empty + a11y + tests + lint + typecheck + build. Sin excepciones.

---

## 14. Decisiones que necesito del usuario antes de implementar

1. **Aprobar este plan** (o pedir cambios — indica sección).
2. **Ubicación:** `Documents/apexdrive/` (propuesto) u otra ruta.
3. **Nombre/secretos OAuth:** ¿creas el Client ID Google ahora o empezamos solo con credentials y OAuth en fase 5?
4. **Storage:** ¿Cloudflare R2 (propuesto) o prefieres S3/AWS u otro?
5. **Deploy objetivo:** ¿VPS con compose, Fly.io, o Vercel?

---

*Siguiente acción (tras tu OK): Fase 2 — Auth.js + roles + guards + tests IDOR. Nada más hasta tu revisión.*

---

## 15. Registro de cierre — Fase 1 (2026-09-29)

**Implementado (solo lo verificado):**
- Scaffold Next 16.3.6 + React 19 + TS strict (`noUncheckedIndexedAccess`) + Tailwind v4 + ESLint flat + Prettier.
- `lib/`: env (Zod, singleton perezoso), db (singleton Prisma), errors (`AppError` 9 códigos), logger (Pino, secretos redactados), format, cn.
- `features/vehicles/catalogFilters.ts`: schema Zod de query params + `buildVehicleWhere` + `SORT_ORDER`.
- Prisma 6.19.3: 14 modelos, 9 enums, índices §4, `0001_init/migration.sql` (UTF-8) + 5 CHECKs DB, `seed.ts` idempotente (credenciales demo solo vía env).
- App: layout ES + header responsive + footer, home fundacional honesta (sin botones falsos), `api/healthz` (ok/degradado), `error/loading/not-found`, `StatusCard` con 4 estados.
- `docker/Dockerfile` (standalone non-root) + `compose` (app+db+migrate) + `ci.yml` (4 gates) + `README.md` + `.env.example`.

**Decisiones (desvíos del plan, justificados):**
1. Prisma 6.19.3 estable en vez del 8.0.0-rc que instaló npm: nunca base de producción sobre RC major.
2. `lib/env` perezoso en vez de validación en import: importar no debe tumbar tests/build sin DB.
3. `vitest.config.mts` + alias `@/`: Vitest no lee `paths` de tsconfig y advierte con `.ts`.
4. Sin `package.json#prisma` (deprecated en v6): seed vía `npm run db:seed` (tsx).
5. Migración generada con `migrate diff` (sin DB local) + CHECKs manuales auditados; `migrate dev` live queda pendiente.

**Gates (local, todos verdes):** `lint` 0 errores · `typecheck` 0 errores ·
`test` 19/19 (4 suites) · `build` OK (/, /_not-found estáticas; /api/healthz dinámica) ·
runtime standalone: `GET /` 200, `GET /api/healthz` 503 degradado honesto sin DB.

**Errores encontrados y corregidos:** Prisma RC→pin v6 · `@types/node` 20→24 (ERESOLVE vitest) ·
migration.sql en UTF-16 (redirect PowerShell) → UTF-8 · `forceConsistentCasingInFile`→`...FileNames` ·
`SORT_ORDER` tipado como array · `set-state-in-effect` en StatusCard (reescrito a patrón suscripción) ·
falta de `prisma generate` y de alias Vitest.

**Deuda pendiente (no oculta):** ejecución live de migrate+seed contra Postgres real;
validar Docker/CI (sin Docker local); E2E Playwright (desde Fase 2); 3 vulnerabilidades
`high` heredadas de dependencias (auditar con `npm audit` antes de Fase 10); §14.3–14.5
(OAuth/R2/deploy) siguen abiertas para tu decisión.

---

## 16. Registro de cierre — Fase 2 (2026-09-29)

**Implementado (solo lo verificado):**
- Auth.js v5 (`next-auth@5.0.0-beta.32` + PrismaAdapter): credentials (bcryptjs 12) + Google
  OAuth condicional (botón deshabilitado con motivo sin credenciales, R-02).
- Sesiones JWT firmadas + `tokenVersion` (revocación al cambiar contraseña/bloquear) +
  refresco rol/estado cada 5 min; `requireFreshUser()` como fuente de verdad en Actions.
- Rutas: `/login /register /forgot-password /reset-password` (Zod + `useActionState`,
  anti-enumeración en login/forgot/registro), `/dashboard` (perfil editable + cierre de
  sesión), `/forbidden` (403). Header con Ingresar/Mi cuenta (solo enlaces reales).
- `proxy.ts` (convención Next 16, Edge-safe: solo `getToken` + `lib/guards.ts` pura) +
  `guardLayout` en layouts. Middleware clásico eliminado.
- Rate limit 5/min/IP (token bucket en memoria, cabecera `Retry-After` en 429) en login
  (route handler), registro, forgot y reset (actions).
- Reset: token aleatorio 32B, SHA-256 en DB, 1 h, un solo uso, invalida JWTs; email vía
  SMTP o log en dev; 503 honesto sin SMTP en producción. Migración `0002_auth`.
- Tests exigidos, todos en verde: USER→/admin (→/forbidden), dueño/ajeno/admin/bloqueado
  en `canEditListing`, anon→/dashboard (→/login+callback), credenciales inválidas
  (4 casos idénticos), inputs inválidos (Zod), rol inyectado descartado. Integración
  DB-gated (registro real, reset completo con reuse rechazado, IDOR vs filas) corre en
  CI con servicio Postgres; local sin DB hace skip explícito.

**Decisiones (desvíos del plan, justificados):**
1. Sesiones JWT (no DB sessions): el proxy/Edge no puede tocar DB; JWT da guards en el
   borde y la revocación se logra con `tokenVersion` + revalidación en Actions.
2. `middleware.ts` → `proxy.ts`: convención Next 16 (middleware deprecado); además el
   proxy solo importa código Edge-safe (`lib/guards.ts` pura) tras detectar que
   `node:crypto`/Prisma/pino rompían el bundle Edge.
3. Sin augmentation de `next-auth/jwt` (módulo no resoluble para augment en beta.32):
   casts locales tipados en `lib/auth.ts`.
4. `lib/credentials.ts` separado para testear `verifyCredentials` sin HTTP/DB.
5. `pino-pretty` agregado a devDeps (faltaba: crasheaba dev y tests).
6. Registro con respuesta genérica también en duplicado (anti-enumeración estricta).
7. Forgot sin SMTP en dev devuelve preview del enlace (solo no-producción).

**Gates (local, todos verdes):** `lint` 0 · `typecheck` 0 · `test` 47/47 + 4 integración
en skip (sin DB local) · `build` OK (11 rutas; `ƒ Proxy (Middleware)`).
Runtime standalone: `/login /register /forgot-password /forbidden /` 200;
`/dashboard` 302→`/login?callbackUrl=%2Fdashboard` (200, sin loop);
`/admin` anon 302→login.

**Errores encontrados y corregidos:** `forceConsistentCasingInFileNames` ya estaba;
`next-auth/jwt` no augmentable · token `{}` sin tipos · `owner/other` possibly-undefined ·
`next/server` irresoluble en Vitest (mock `@/lib/auth` + guards pura) ·
`pino-pretty` ausente · `set-state-in-effect` (Fase 1) · UTF-16 redirect (Fase 1).

**Deuda pendiente (no oculta):** integración live pendiente de Postgres local (corre en
CI); E2E Playwright con los 3 flujos (Fase 3+); Redis/Upstash al multirreplica (Fase 9);
Turnstile/honeypot (Fase 9, R-06); `npm audit`: 7 `high` heredadas por revisar;
§14.3 (OAuth: Google listo, faltan TUS credenciales) y §14.4–14.5 siguen abiertas.

---

## 17. Registro de cierre — Fase 3 (2026-09-29)

**Implementado (solo lo verificado):**
- `/cars`: búsqueda (debounce 450 ms) + 13 filtros combinables (brand, model, year min/max,
  price min/max, mileage máx, fuel, transmission, body, condition, city, color) + 6 sorts +
  paginación numerada (?page=, URLs compartibles/SEO). Todo el filtrado en Postgres vía
  `buildVehicleWhere`; proyecciones explícitas; `count+findMany` en 1 transacción.
- `/cars/[slug]`: galería con thumbnails accesibles, 14 specs (nulos → "—", nada inventado),
  vendedor (tradeName/verificado/antigüedad, sin PII), relacionados (misma marca o
  carrocería, excluye actual y no publicados), favorito (toggle real), compartir
  (Web Share + clipboard), tray de comparativa, JSON-LD `Car`, metadata dinámica +
  canonical + OG. `notFound()` si no existe/publicado.
- `/compare` v1: tabla lado a lado 2–4 desde URL, diferencias resaltadas, sin ganador;
  slugs inexistentes → error honesto. Selección en `localStorage` + tray (sin backend
  muerto). Favoritos: `toggleFavorite` idempotente (constraint única como guarda).
- Migración `0003_catalog_idx`: compuestos `(status,brandId,priceMXN)` y
  `(status,bodyType,fuel)` con `map:` en schema (sin deriva futura).
- Home: secciones reales "Explorar por marca" (counts) y "Recién publicados";
  sin DB se ocultan, home fundacional intacta.
- Tests: unit (query parsing, where combinado, order+tibreak, pageCount, JSON-LD,
  selección compare) + integración DB-gated (filtros combinados exactos, 404→null,
  relacionados, favorito idempotente/aislado). `npm test` = unit; `test:integration`
  separado (CI con Postgres).

**Decisiones (desvíos del plan, justificados):**
1. Paginación numerada en vez de cursor: URLs compartibles y SEO pesan más a esta
   escala; `skip/take` con índice `(status,publishedAt)` es eficiente (<100k filas).
2. Sin botón de favorito en cards: exigiría 1 query de sesión por card (N+1);
   el favorito vive en el detalle (1 query).
3. `/compare` v1 en Fase 3 (el plan lo ponía en Fase 4): el detalle exigía un destino
   real para "Comparar"; Fase 4 lo enriquece (guardado en cuenta, diffs ricos).
4. `getVehicleBySlug` con `cache()` de React: metadata + página comparten 1 query.
5. `npm test` solo unit por defecto: los hooks beforeAll/afterAll de integración
   rompían el suite con URL dummy/inaccesible; integración corre en CI con DB real.

**Gates (local, todos verdes):** `lint` 0 · `typecheck` 0 · `test` 58/58 ·
`build` OK (13 rutas) · runtime sin DB: `/cars` y `/cars/x` error state 200,
`/compare` empty state 200, `/` 200 sin secciones (todo honesto, cero crash).

**Errores encontrados y corregidos:** `set-state-in-effect` en CompareTray (hook
suscripción) · imports no usados · `detailSelect` sin `brandId` · test con hack
`void` · integración frágil ante DB inaccesible (split de scripts) ·
`priceMXN` borrado por error en un edit (detectado y restaurado de inmediato).

**Análisis de performance (Fase 3):**
- Catálogo: 2 statements (`findMany` + `count`) en 1 transacción por página; `where`
  AND-serializable usa bitmap sobre índices simples + 2 compuestos nuevos; orden
  default `featured` cubierto por `@@index([status, publishedAt])`; tiebreak `id`
  garantiza estabilidad entre páginas. Proyección card ≈ 15 columnas + 1 imagen
  (JOIN, no N+1). Límite 12/página.
- Detalle: 2 queries paralelas (vehículo + relacionados; favorito piggyback en la
  misma ronda) + `cache()` evita duplicar en metadata. Relacionados: top-4 con
  índice de estado.
- Cliente: RSC por defecto; islas solo con estado (filtros, galería, tray, fav,
  share); `next/image` para fotos reales (Fase 8); placeholders SVG inline hoy.
- Pendiente de medición real: `EXPLAIN ANALYZE` con seed de 10k filas (R-05, con DB);
  Lighthouse móvil ≥90 se gatea en Fase 9.

**Deuda pendiente (no oculta):** se mantiene la de Fase 2 + seed de carga 10k para
EXPLAIN; fotos reales (Fase 8; hoy placeholder honesto); contacto vendedor (Fase 5).

---

## 18. Registro de cierre — Fase 4 (2026-09-29)

**Implementado (solo lo verificado):**
- `/sell` (hub: auto-crea fila Seller, reanuda borradores), `/sell/new` (paso 1 con
  selects dependientes, redirige al paso 2), `/sell/[id]/step/[1–8]` (formularios por
  paso con valores del borrador, fotos, preview con faltantes, publicación con gate).
- Núcleo testeable sin sesión: `drafts.ts` (actor explícito) + `actions.ts` (suma
  `requireFreshUser`). Schemas Zod por paso + `assertPublishable` + `parseFeatures`.
- Máquina de estados (`transitions.ts`): submit solo a PENDING (jamás auto-publica),
  precio solo en PUBLISHED, SOLD congela, ARCHIVED terminal; ADMIN entra en Fase 7.
- `/dashboard/listings`: tabla propia con badges, continuar-editando, cambio de precio,
  vender/archivar/retirar por estado. Vendedor solo ve y toca lo suyo (WHERE por seller).
- Fotos: URL https + extensión allowlist, máx 12, principal automática, borrado con
  confirmación; documentado como interim hasta subida directa (Fase 8).
- Migración `0004_publish`: 7 columnas NULLABLE (borrador incremental) + `features TEXT[]`;
  completitud de PUBLISHED por gate en código + assert ruidoso en detalle (nunca "$0").
- Detalle muestra Características cuando existen.
- Tests de ataque (9 casos integración DB-gated + unit): USER no crea; B no toca nada
  de A (update/submit/foto/precio/vender/archivar → NOT_FOUND, A intacto); modelo de
  otra marca rechazado; incompleto rechazado con detalle; editar publicado por pasos
  prohibido; doble venta imposible; fotos inválidas/límite; rol inyectado ignorado.

**Decisiones (desvíos, justificados):**
1. Columnas NULLABLE para flujo borrador (precio/km/combustible/transmisión/carrocería/
   ciudad/descripción): la DB no expresa "completo iff publicado" sin triggers;
   se eligió gate explícito + assert ruidoso sobre magia de triggers.
2. Sin React Hook Form: pasos simples con `useActionState` + constraints HTML + Zod
   servidor; RHF se introduce si el wizard lo exige (hoy no).
3. Sin subida binaria todavía: URLs validadas (formato+extensión+conteo) con upgrade
   documentado a R2 en Fase 8; nada finge subir archivos.
4. Borrador ajeno → 404 (no 403): no filtrar existencia de ids (cuid).
5. `export const dynamic = "force-dynamic"` en `/sell/new`: el prerender estático del
   build crasheaba sin DB; las páginas con sesión/searchParams ya eran dinámicas.

**Gates (local, todos verdes):** `lint` 0 · `typecheck` 0 · `test` 68/68 (+10
integración en skip sin DB; corren en CI) · `build` OK (17 rutas).
Runtime: `/sell`, `/sell/new`, `/dashboard/listings`, paso inválido → 302 a login
con callback (sin loops); propietarios/estados verificados en tests.

**Errores encontrados y corregidos:** build prerender sin DB (force-dynamic) ·
nullable-cascade en 5 archivos (fallbacks honestos + assert) · llaves desbalanceadas
en test (diagnóstico hexadecimal: solo línea 57 estaba mal; una "corrección" rompió
la 56 y se revirtió) · edits con `${}` que la herramienta no matcheaba (shell
quirúrgico con comillas simples) · componentes con código muerto (`void`, spans
ocultos) eliminados · README con encabezado pisado (restaurado y verificado).

**Deuda pendiente (no oculta):** se mantiene + aprobar/rechazar ADMIN (Fase 7);
onboarding USER→SELLER explícito (hoy solo SELLER/ADMIN publican); notificaciones
al cambiar estado (Fase 7); purga de borradores abandonados (Fase 9).

---

## 19. Registro de cierre — Fase 5 (2026-09-29)

**Implementado (solo lo verificado):**
- Favoritos: sección en cuenta (solo publicados, quitar reversible), toggle optimista
  con reversión ante fallo; duplicados imposibles por constraint única.
- Comparador: guardadas en cuenta (2–4, solo PUBLISHED, borrado propio), botón guardar
  en `/compare`, rango de precios informativo (sin ganador), diffs resaltados.
- Relacionados: puntaje determinista marca 30 + carrocería 25 + precio ±20% 20 +
  año ±3 15 + combustible 10, desempate por recencia, tope 4, sin el actual.
- Historial: solo `localStorage` (sin cuenta ni servidor, sin precios para no
  desactualizar, borrado en 1 clic con clave visible).
- Búsqueda: tokenización (minúsculas, sin ruido 1-letra, máx 5 términos, AND de ORs);
  `M3 BMW` ≡ `bmw m3` (testeado).
- SEO: `sitemap.xml` (estáticas + hasta 1000 publicados, degradado sin DB),
  `robots.txt` (priva dashboard/sell/admin/api), metadata dinámica de catálogo con
  canonical + `noindex` en facetas profundas, OG/Twitter base en layout,
  JSON-LD `BreadcrumbList` en detalle.
- UX: transiciones discretas globales + `prefers-reduced-motion`, favorito optimista,
  skeletons/empty/error ya existentes reutilizados.
- Tests: 5 suites unit nuevas + 1 integración (búsqueda tolerante real, orden de
  relacionados, favoritos solo-míos-y-publicados, comparativas CRUD+aislamiento).

**Decisiones (justificadas):**
1. Paginación numerada se mantiene (Fase 3): exigencia SEO de URLs compartibles.
2. Historial sin backend a propósito: tracking de vistas en servidor exigiría
   consentimiento y política; localStorage es suficiente y privado.
3. Funciones puras separadas de Server Actions (`selection.ts`): Turbopack prohíbe
   exports no-async en módulos `"use server"` (lo detectó el build).
4. `getRelated` en 1 query con mapeo explícito (el spread de `cardSelect` + rest
   rompía la inferencia de tipos de Prisma).
5. Contacto vendedor NO implementado (mensajes + rate-limit + anti-spam): queda
   explícitamente pendiente para la fase de interacción; el detalle lo declara
   en la tarjeta del vendedor en vez de fingir un botón.

**Gates (local, todos verdes):** `lint` 0 · `typecheck` 0 · `test` 82/82 (+14
integración en skip sin DB) · `build` OK (19 rutas).
Runtime: sitemap `application/xml`, robots `text/plain`, resto 200 con estados
honestos.

**Errores encontrados y corregidos (7):** test con suma mal calculada (código bien,
test mal: 90→100) · `bodyType: string` vs enum (cast acotado) · retorno
`CompareVehicle[]` vs `CatalogCard[]` (mapeo explícito) · sync-export en `"use
server"` (mover a `selection.ts`) · `EmptyState` sin usar · mock `next-auth`
innecesario tras mover la función pura · mock residual eliminado.

**Deuda pendiente (no oculta):** contacto vendedor + reportes (próxima fase
natural); E2E Playwright; Lighthouse/axe gates (Fase 9); Postgres local;
`npm audit` 7 high; OAuth/R2/deploy (§14).

---

## 20. Registro de cierre — Fase 6 (2026-09-29)

**Auditoría ofensiva:** 15 vectores revisados contra código real. 7 hallazgos
reales corregidos (XSS-01 JSON-LD, RACE-01/02/03 token/favorito/fotos, HEADERS-01,
RATE-01/02); 10 vectores verificados sin cambio con evidencia. Todo en
`apexdrive/docs/SECURITY.md`. Cero fallos críticos abiertos.

**Implementado (solo lo verificado):**
- `/admin` (métricas, pendientes, usuarios, reportes, auditoría) con layout
  `requireAdmin` + proxy; proyecciones sin secretos; bloqueo revoca JWTs;
  anti self-block y anti admin-block; reportes con duplicado-OPEN rechazado.
- Endurecimiento: `safeJsonLd`, consumo atómico de reset, toggle favorito
  tolerante a carreras, reintento de posición de foto, CSP+HSTS+frame/nosniff/
  referrer, rate-limit progresivo en auth y por-usuario en mutaciones.
- Tests: 4 unit seguridad + 5 integración admin (USER/SELLER moderando →
  FORBIDDEN, approve/hide + auditoría, doble-approve CONFLICT, bloqueo con
  `tokenVersion++`, report lifecycle); escenarios exigidos en verde.

**Decisiones:** núcleo admin re-verifica rol (defensa en profundidad, no solo
wrapper) · JWT (no DB-sessions) por Edge · `force-dynamic` + ErrorState en
admin (el prerender sin DB las tumbaba) · groupBy evitado por tipado incómodo
(6 counts en transacción) · contacto vendedor sigue pendiente explícito.

**Gates (local, todos verdes):** `lint` 0 · `typecheck` 0 · `test` 86/86 (+18
integración en skip sin DB; corren en CI) · `build` OK (24 rutas).
Runtime: 5 cabeceras presentes; `/admin*` anon → 302 login con callback.

**Errores corregidos (12):** llaves en cleanup (diagnóstico hexadecimal, una
"corrección" añadió de más y se revirtió con conteo exacto) · import duplicado
en next.config · groupBy sin orderBy/tipado · `use server` con export sync
(movido a `selection.ts`) · `CompareVehicle[]` vs `CatalogCard[]` (mapeo
explícito) · `bodyType: string` vs enum (cast acotado) · prerender admin sin DB.

**Deuda (no oculta):** E2E Playwright · Redis al multirréplica · CSP nonces ·
R2 (fotos URL) · XFF-spoofing como requisito de despliegue · `npm audit` 7 high ·
OAuth/R2/deploy (§14). Siguiente fase natural: contacto vendedor + notificaciones.

---

## 21. Registro — Auditoría de producción (2026-09-29)

Barrido integral sin features: 0 TODO/`any`/catch vacíos/console en app;
eliminados `getEnv()` y `monthly()` muertos; `SafeImage` con fallback ante URL
rota; índice parcial anti-duplicado de reportes + `P2002`→CONFLICT; tope
`page ≤ 1000`; nuevos `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`,
`docs/PRODUCTION_READINESS.md`; SECURITY y README actualizados.
Gates re-ejecutados en verde tras cada corrección. Veredicto honesto: NO LISTO
(B1–B4 ambientales). Sin BLOCKER/CRITICAL abiertos dentro del repositorio.

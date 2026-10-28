# ApexDrive — Production Readiness (2026-09-29)

> Actualización 2026-10-26: rediseño visual entregado, Next.js 16.4.3, 84 unitarias
> y 22 E2E públicos aprobados, 29 pruebas de integración omitidas por falta de DB.
> Auditoría actual: 0 críticas y 7 altas. Ya existe Playwright y cobertura pública
> en CI; faltan los E2E autenticados de comprador/vendedor/admin. El resto de este
> documento conserva la auditoría histórica. Ver `INFORME_FINAL_VISUAL.md` para
> el estado actual y `dependency-audit.json` para las alertas restantes.

Auditoría integral pre-producción: CODE, DATABASE, SECURITY, PERFORMANCE, UX,
A11Y, ERROR HANDLING, TESTING, BUILD. Sin features nuevas en esta fase.

## Veredicto: NO LISTO para producción

Existen bloqueos de infraestructura y trabajo pendiente en el código; consulta el README actualizado.
La auditoría histórica no sustituye la revisión de dependencias ni la validación actual con base de datos.
Re-verificado como auditor externo el 2026-09-29 (ver § Re-verificación).

## BLOCKER (impiden lanzar; ninguno resoluble solo con código)

- **B1 — Migraciones jamás aplicadas en vivo.** `0001–0005` generadas y
  validadas estáticamente (`prisma validate`), pero `migrate deploy` + `seed`
  nunca corrieron contra un Postgres real (sin Docker local). Sin esto no hay
  producto. Acción: provisionar Postgres 16 → `migrate deploy` → smoke.
- **B2 — Sin E2E.** Playwright ni instalado; los 3 flujos (usuario, vendedor,
  admin) solo existen como tests unit/integración. Acción: instalar Playwright,
  implementar `tests/e2e/` según MASTER_PLAN §11 y gatearlos en CI.
- **B3 — Sin Postgres provisionado.** Ni local ni administrado; 18 tests de
  integración en skip permanente fuera de CI. Acción: Docker Desktop local +
  Postgres administrado para prod.
- **B4 — Secretos y proveedores sin configurar.** `AUTH_SECRET`, `DATABASE_URL`,
  Google OAuth, SMTP, dominio+HTTPS. Acción: completar `.env` en el host
  (ver `docs/DEPLOYMENT.md`).

## CRITICAL

Ninguno abierto. Los encontrados (XSS-01 en JSON-LD) se corrigieron con test.

## HIGH (resolver antes de tráfico real)

- **H1 — `npm audit`: 7 vulnerabilidades `high` heredadas sin revisar.**
- **H2 — Rate-limit en memoria + confianza en XFF.** Válido single-instance;
  con multirréplica migrar a Redis; el hosting debe eliminar XFF forjado.
- **H3 — Fotos por URL de terceros** (tracking/disponibilidad fuera de control)
  hasta Fase 8 (R2 + `remotePatterns` + `next/image`).
- **H4 — Sin backups, monitoreo ni alertas** (responsabilidad del host;
  procedimiento en `docs/DEPLOYMENT.md`).
- **H5 — CSP con `unsafe-inline`** (necesario sin nonces; upgrade Fase 9).

## MEDIUM

- **M1** — Offset pagination (`skip`): eficiente a escala actual con índice;
  migrar a keyset si el catálogo supera ~100k filas.
- **M2** — Búsqueda `LIKE %término%` sin trigram: bien a escala actual.
- **M3** — JWT de 30 días: largo pero revocable (`tokenVersion`); considerar 7 días.
- **M4** — Extensión de foto no garantiza contenido (solo allowlist): riesgo
  limitado al contexto `<img>` (sin ejecución); Fase 8 re-encodea.
- **M5** — Fallo de red en Server Action cae al `error boundary` global
  (correcto pero genérico; formularios podrían reintentar inline).

## LOW

- Tabla `ContactMessage` sin UI (schema listo para fase de contacto).
- `publishedAt` conservado al re-aprobar (semántica menor).
- Listas admin topadas a 100 sin paginación (aceptable hoy).
- Botones densos ~28px (cumplen mínimo WCAG 2.2 AA de 24px).

## PASSED (verificado con evidencia)

- **CODE**: 0 TODO/FIXME/`any`/catch vacíos/`console.log` en app; `getEnv` y
  `monthly()` muertos eliminados; sin imports muertos (lint); archivos ≤306
  líneas cohesivos; dependencias todas en uso.
- **DATABASE**: índices cubren filtros/orden/uniques (incl. 2 compuestos +
  parcial de reportes); cascadas auditadas (soft-delete publicado, Restrict en
  catálogo, Cascade donde corresponde); migraciones UTF-8 versionadas;
  0 N+1 (includes = JOIN, proyecciones explícitas, `Promise.all` paralelo);
  singleton de conexión; transacciones donde hay invariantes.
- **SECURITY**: 15 vectores + re-auditoría (ver `docs/SECURITY.md`); roles en
  servidor; 429 con `Retry-After`; PII contenida; cabeceras verificadas en runtime.
- **PERFORMANCE**: RSC por defecto + 30 islas justificadas; sin waterfalls
  (paralelo); paginación 12/pág con tope anti-offset; `SafeImage` con fallback;
  skeletons en cada ruta con datos.
- **UX (estático, 6 anchos)**: grids colapsan, tablas con scroll-x, sin anchos
  fijos rotos, touch ≥24px, `prefers-reduced-motion`, formularios con labels y
  hints, sin modales propios (confirms nativos).
- **A11Y (estático)**: skip-link, landmarks, h1 único por página, labels reales,
  `aria-pressed/expanded/current`, alts (decorativas `""`), foco visible global,
  contraste ≥4.5:1 verificado en paleta (muted 7:1, badges ≥7:1).
- **ERRORS**: offline (503/error states), 404 con status, 403, imagen rota,
  red con reintento, formularios con mensajes — verificados en runtime o tests.
- **TESTS**: 84 unit + 18 integración (skip sin DB, corren en CI).
- **BUILD**: lint 0, typecheck 0, build OK (24 rutas), smoke 200/302/404/503 honestos.
- **DOCS**: README, MASTER_PLAN, ARCHITECTURE, SECURITY, DEPLOYMENT al día.

## Re-verificación externa (2026-09-29)

Segundo par de ojos sin confiar en docs: 2 HIGH (.dockerignore ausente, seed en
migrate) + 2 MEDIUM (home estática sin datos, filtros desincronizados) + 1 LOW
(dupes en compare) corregidos; `scope="col"` en tablas; healthz con readiness
de auth. Veredicto sin cambios: NO LISTO por B1–B4 ambientales.

## Qué está listo / qué falta / riesgos / servicios / env / deploy / rollback / verificación

- **Listo**: código, migraciones, seed, tests, docs, CI, Docker, guards, SEO técnico.
- **Falta**: B1–B4 (infra) + H1–H5 antes de tráfico real.
- **Riesgos restantes**: §deuda de MASTER_PLAN §20 + H1–H5 + E2E.
- **Servicios externos**: Postgres 16, SMTP (opcional), Google OAuth (opcional),
  hosting Docker/Node 24, DNS+HTTPS.
- **Variables**: tabla completa en `docs/DEPLOYMENT.md`.
- **Deploy/rollback/verificación**: procedimientos en `docs/DEPLOYMENT.md`
  (migraciones aditivas → rollback = imagen previa + healthz + smoke).

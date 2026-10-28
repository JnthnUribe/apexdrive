# ApexDrive — Informe de seguridad (Fase 6)

Metodología: revisión ofensiva del código real (auth, actions, proxy, uploads,
render) + corrección inmediata + tests que atacan. Estado: **sin fallos críticos
abiertos**. Deuda numerada al final.

## Hallazgos corregidos

### XSS-01 — Breakout `</script>` en JSON-LD (CRÍTICO, corregido)
- Dónde: `app/cars/[slug]/page.tsx` inyectaba `JSON.stringify(datos DB)` en
  `<script>`. Un título con `</script>` rompía el bloque → XSS almacenado.
- Fix: `safeJsonLd()` (`lib/seo.ts`, escapa `<` → `\u003c`) en los 2 scripts.
- Test: `tests/unit/security.test.ts` (payload malicioso neutralizado + roundtrip).
- Resto del render: React escapa por defecto; verificado en formularios y mensajes.

### RACE-01 — Reuso de token de reset (ALTO, corregido)
- `resetPassword` verificaba y marcaba en pasos separados: doble submit
  concurrente consumía el mismo token dos veces.
- Fix: `updateMany({ where: { id, usedAt: null } })` atómico; `count === 0` →
  error. La propiedad garantizada es un-solo-uso (nota: ante carrera, el
  password final es el del último escritor; el token jamás se reutiliza).

### RACE-02 — Toggle favorito doble-click (MEDIO, corregido)
- Patrón check-then-act: `P2002` crasheaba en carrera; `P2003` (id inexistente)
  filtraba internals de Prisma al cliente.
- Fix: `P2003` → 404 honesto; `P2002` → completa el toggle (delete idempotente).

### RACE-03 — Posición de foto concurrente (MEDIO, corregido)
- Dos altas simultáneas colisionaban en `@@unique([listingId, position])`.
- Fix: conteo fresco + reintento (máx 3) ante `P2002`; límite 12 revalidado
  contra DB, no contra snapshot.

### HEADERS-01 — Sin cabeceras de seguridad (ALTO, corregido)
- `next.config.ts` ahora envía: `nosniff`, `DENY` (frame), `Referrer-Policy`,
  HSTS (inocuo en http local) y CSP pragmática (`unsafe-inline` en scripts y
  estilos porque Next inserta inline; upgrade a nonces en Fase 9).

### RATE-01 — Sin límite en mutaciones autenticadas (MEDIO, corregido)
- Favoritos, comparativas, borradores, fotos, precios y gestión ahora tienen
  `limitOrThrow` por `userId` (60/min; submit 10/min; reportes 5/hora).

### RATE-02 — Sin escalado ante fuerza bruta (MEDIO, corregido)
- `consumeAuth`: 5/min → 15 min → 1 h ante denegaciones repetidas, con
  `Retry-After`. Aplica a login (route + actions de auth).

## Verificados sin cambio (con evidencia)

| Área | Estado |
|---|---|
| SQL injection | Prisma parametriza todo; único raw es `SELECT 1` estático; `orderBy` desde mapa, nunca input crudo |
| Mass assignment | Todos los writes eligen campos explícitos; `role` se descarta en Zod (test) |
| IDOR / broken access | Ownership en cada `WHERE` (`seller.userId`), borrador ajeno → 404, tests de ataque en 3 suites |
| Privilege escalation | Rol solo desde DB (jwt + `requireFreshUser`); `tokenVersion` revoca; tests de rol inyectado |
| CSRF | Server Actions con origin-check; OAuth con state/nonce de Auth.js; logout por POST |
| File upload | Sin binarios (URLs https + allowlist de extensión + tope); SVG/`.exe` rechazados (tests) |
| Enumeration | Login/forgot/registro/reset responden idéntico exista o no la cuenta (tests) |
| Redirects | `callbackUrl` validado same-origin; Auth.js bloquea externos por defecto |
| PII | Admin/users sin `passwordHash`; vendedor público sin contacto; reportes solo ADMIN |
| Inputs enormes | Zod `max` en todos los campos libres (tests); comparación corta nombre a 60 |

## Riesgos aceptados / deuda

1. **XFF spoofing**: el rate-limit por IP asume que el proxy/hosting elimina
   `X-Forwarded-For` forjado. Requisito de despliegue (RUNBOOK Fase 9).
2. **Rate-limit en memoria**: válido single-instance; migrar a Redis al
   multirréplica (Fase 9, interfaz `consume` sin cambios).
3. **CSP con `unsafe-inline`**: necesario sin nonces; upgrade en Fase 9.
4. **Fotos por URL**: el navegador del visitante las carga (tracking teórico por
   terceros); Fase 8 (R2) lo elimina.
5. **`npm audit`**: 7 `high` heredadas pendientes de revisión antes de Fase 10.
6. **E2E de login/ataque HTTP**: pendiente Playwright (los escenarios están
   cubiertos a nivel unit/integración).

## Cómo re-verificar

`npm run lint && npm run typecheck && npm run test && npm run test:integration`
(con DB) `&& npm run build`; smoke: headers con `curl -I`, 302 en `/admin` anónimo,
403 en `/forbidden` para USER (tests `resolveGuard`).

---

## Re-auditoría pre-producción (2026-09-29)

Segundo barrido completo (código nuevo desde Fase 6 incluido):

- **Dedupe de reportes (nuevo)**: el check-then-act de `createReportAction`
  tenía la misma carrera que RACE-02. Fix: índice único parcial
  (`0005`, solo `OPEN` + `reporterId` no nulo) + catch `P2002` → CONFLICT.
  Test de integración: segundo OPEN idéntico falla a nivel DB; tras resolver,
  se permite de nuevo.
- **DoS por offset**: `?page=99999` generaba `skip` gigante. Fix: tope
  `page ≤ 1000` en Zod (cae a default seguro). Test incluido.
- **Imágenes rotas**: `SafeImage` con fallback a placeholder ante `onError`
  (antes: icono roto). Sin `next/image` aún: URLs remotas de usuarios no pueden
  pasar por el optimizador sin proxy (Fase 8 R2 + `remotePatterns`).
- **Re-verificado sin cambio**: ownership en admin (núcleo + wrapper),
  proyecciones admin sin secretos, `callbackUrl` same-origin, tokens sin log,
  Zod `max` en todos los campos nuevos, decisiones de moderación con enum
  explícito, `P2003` mapeados.
- **Pendiente conocido** (en PRODUCTION_READINESS.md): E2E HTTP de ataques,
  CSP nonces, Redis, R2, XFF en despliegue.

---

## Tercera revisión — auditor externo (2026-09-29)

Sin confiar en docs ni comentarios; verificado contra código y runtime:

- **Sin `.dockerignore` (HIGH, corregido)**: `COPY . .` incluía `.env`,
  `.next`, `node_modules` y `.git` en el contexto. Creado con exclusiones.
- **Seed en pipeline de migrate (HIGH, corregido)**: compose ejecutaba
  `migrate deploy && seed` siempre → prod habría recibido datos ficticios.
  Separado: `migrate` (deploy) + servicio `seed` con perfil dev + aviso.
- **Home estática sin datos (MEDIUM, corregido)**: prerender sin DB horneaba
  la home sin secciones para siempre. Fix: ISR `revalidate = 3600`
  (igual en sitemap).
- **Filtros no-controlados desincronizados (MEDIUM, corregido)**: tras navegar
  (p. ej. chip de marca), selects conservaban valor viejo. Fix: `key` por query.
- **Comparar con slugs duplicados (LOW, corregido)**: `parseCompareSlugs`
  ahora deduplica.
- **Sin `console.*` en app**: solo `seed.ts` (CLI, legítimo). Sin `eval`,
  sin `innerHTML` salvo JSON-LD saneado, sin mocks fuera de tests, sin
  secretos en repo (verificado por grep).
- **Healthz extendido**: reporta `auth.secretConfigured` para el checklist.

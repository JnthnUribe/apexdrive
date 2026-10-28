# ApexDrive

Plataforma de anuncios de automóviles para México con Next.js 16, React 19,
TypeScript, Tailwind CSS 4, PostgreSQL y Prisma 6. No procesa compras ni pagos.

![Portada](docs/screenshots/home-desktop.png)

## Estado

En desarrollo; todavía no listo para producción. La entrega del 26 de octubre de
2026 registró 84 pruebas unitarias y 22 E2E públicos aprobados. Las 29 pruebas de
integración quedaron pendientes por falta de BD. La auditoría de esa entrega
registró 7 alertas altas. Son resultados históricos, no una garantía sobre cambios posteriores.

| Área | Implementado | Pendiente |
| --- | --- | --- |
| Interfaz | Portada editorial, responsive, navegación | Contenido real |
| Catálogo | Filtros, ordenamiento, paginación, ficha, comparador | Validación con BD desplegada |
| Cuentas | Credenciales, Google opcional, recuperación, roles | Configurar SMTP y servicios |
| Publicaciones | Borradores, revisión, gestión propia | Alta de vendedores, carga de archivos |
| Comunidad | Favoritos, comparativas, reportes | Contacto con vendedor |
| Administración | Moderación, usuarios, auditoría | Prueba de flujos con BD |
| Operación | Migraciones, CI, Docker, health check | Hosting, backups, monitoreo, rate limit compartido |

## Inicio rápido

Requisitos: Node.js 24, npm y PostgreSQL 16 local o administrado, por ejemplo Neon.
En PowerShell, dentro del repositorio:

```powershell
npm ci
Copy-Item .env.example .env
```

Completa `DATABASE_URL`, `AUTH_SECRET` y `NEXT_PUBLIC_APP_URL` en `.env`.
Genera el secreto con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

No compartas el secreto ni subas `.env` a Git.

```powershell
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abre http://localhost:3000. El seed es opcional y exclusivo de desarrollo: crea
contenido ficticio. Los usuarios demo solo se crean si configuras sus contraseñas.
Sin BD la interfaz puede arrancar degradada, pero las funciones persistentes no operan.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor local |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unitarias |
| `npm run test:integration` | Integración con una base de pruebas aislada |
| `npm run build` | Compilación de producción |
| `npm run test:e2e` | E2E públicos tras compilar; Edge en Windows, Chromium en CI |
| `npm run db:migrate` | Crear migraciones en desarrollo |
| `npx prisma migrate deploy` | Aplicar migraciones existentes |
| `npm run db:studio` | Inspeccionar la base configurada |

## Estructura

- `app/`: rutas, páginas y API.
- `components/`: interfaz compartida.
- `features/`: acciones, consultas y lógica por dominio.
- `lib/`: autenticación, BD, validación y utilidades.
- `prisma/`: esquema, migraciones y seed.
- `tests/`: unitarias, integración y navegador.
- `docker/`: imagen standalone y servicios locales.
- `docs/`: guías, informes y capturas.

## Documentación

- [Instalación, Neon y despliegue](docs/DEPLOYMENT.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Seguridad](docs/SECURITY.md)
- [Pendientes de producción](docs/PRODUCTION_READINESS.md)
- [Informe visual y funcional](docs/INFORME_FINAL_VISUAL.md)
- [Dirección visual y procedencia de imágenes](docs/DESIGN_DIRECTION.md)
- [Plan original por fases](docs/MASTER_PLAN.md)
- [Contribución](CONTRIBUTING.md)

Next.js integra frontend y backend. Neon almacena los datos; el hosting de Next.js
ejecuta las rutas y acciones del servidor. El MCP es una herramienta de desarrollo,
no una dependencia del sitio publicado.

Las imágenes editoriales IA no representan vehículos disponibles.
No se ha seleccionado una licencia de distribución para este repositorio.

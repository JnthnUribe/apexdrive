# Despliegue de ApexDrive

## Arquitectura y estado

Next.js sirve la interfaz y el backend; PostgreSQL almacena los datos. No hace falta
una API independiente. El MCP de Neon permite administrar la BD durante desarrollo;
la aplicación se conecta directamente mediante Prisma, sin depender del MCP.

No está listo para producción: ver README y PRODUCTION_READINESS.md. Primero
valida los flujos con una base real y completa carga de archivos, contacto,
alta de vendedores, correo y rate limit compartido según el alcance de entrega.

## Variables

Copia `.env.example` a `.env` en desarrollo. En hosting usa su gestor de secretos.

| Variable | Uso |
| --- | --- |
| DATABASE_URL | PostgreSQL; requerida para funciones persistentes y migraciones |
| AUTH_SECRET | Firma de sesiones; requerida para login |
| NEXT_PUBLIC_APP_URL | URL pública para enlaces y metadatos; configurar antes del build |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | OAuth opcional; registrar callback `/api/auth/callback/google` |
| SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM | Recuperación de contraseña real |
| DEMO_ADMIN_PASSWORD / DEMO_USER_PASSWORD | Solo seed de desarrollo; nunca producción |
| R2_* | Variables reservadas: configurar valores no implementa por sí solo las subidas |
| LOG_LEVEL | Nivel de logs opcional |
| PORT | Puerto del servidor standalone |

No uses prefijo NEXT_PUBLIC para secretos. Reinicia la aplicación tras cambiar
variables del servidor; recompila si cambias variables públicas.

## PostgreSQL en Neon

1. Crea un proyecto de desarrollo y una rama de pruebas aislada.
2. Obtén la conexión PostgreSQL con SSL desde Neon y guárdala en `.env`.
3. Para tráfico de la app usa la conexión agrupada (pooled).
4. El esquema actual solo declara DATABASE_URL. Para migraciones puedes ejecutar
   Prisma con DATABASE_URL apuntando temporalmente a la conexión directa.
   Otra opción es añadir `directUrl = env("DATABASE_URL_UNPOOLED")` al datasource
   de Prisma 6; si lo haces, configura esa variable también en CI y Docker.
   Esta segunda opción todavía no está implementada en el repositorio.
5. Ejecuta `npx prisma generate` y `npx prisma migrate deploy`.
6. Solo en desarrollo: `npm run db:seed` para cargar ejemplos ficticios.
7. Ejecuta integración sobre la rama de pruebas, nunca sobre producción.

Referencia: https://neon.com/docs/guides/prisma (consulta la sección de Prisma 6).
La base de producción debe mantenerse separada y no recibir el seed.

## Docker para desarrollo local

El compose incluido tiene credenciales de ejemplo y no es una configuración de producción.

```powershell
docker compose -f docker/docker-compose.yml up -d db
docker compose -f docker/docker-compose.yml run --rm migrate
docker compose -f docker/docker-compose.yml --profile seed run --rm seed
docker compose -f docker/docker-compose.yml up -d app
```

El servicio migrate aplica migraciones; seed es un servicio separado y opcional.
Para probar autenticación en este compose añade AUTH_SECRET al entorno del servicio
app mediante un override local fuera de Git. Las variables de `.env` no se inyectan
automáticamente al contenedor si el compose no las declara.

## Publicar en un hosting compatible con Next.js

1. Conecta el repositorio privado y selecciona Node.js 24.
2. Configura las variables, una BD de producción independiente y el dominio.
3. Instala con `npm ci`; genera Prisma con `npx prisma generate`.
4. Ejecuta `npx prisma migrate deploy` en una tarea de release con acceso a la BD.
5. Compila con `npm run build`. En hosting gestionado usa su integración Next.js.
6. Para contenedores, construye `docker/Dockerfile`: incluye servidor standalone,
   public y .next/static. Su comando de arranque es `node server.js`.
7. Configura HTTPS, logs, monitoreo, backups y restauración probada.
8. Verifica los recorridos siguientes antes de habilitar usuarios reales.

El CI ejecuta comprobaciones, pero este repositorio no incluye despliegue automático
ni configura por sí solo reglas de protección de ramas en GitHub.

## Comprobación de entrega

- `/api/healthz`: HTTP 200, database.connected true y auth.secretConfigured true.
  El código HTTP solo refleja disponibilidad de BD; revisa también el campo auth.
- Registro, login, cierre de sesión y recuperación de contraseña con correo real.
- Usuario sin permisos no accede a administración ni modifica anuncios ajenos.
- Vendedor crea borrador, envía a revisión; administrador aprueba; aparece en catálogo.
- Filtros, detalle, favoritos y comparativas con datos reales.
- Imágenes, contacto y alta de vendedores según funcionalidades comprometidas.
- robots, sitemap, enlaces canónicos y 404 correctos en el dominio final.
- Logs sin secretos, protección de cabeceras del proxy y rate limit compartido.

Neon puede reactivar cómputo suspendido: el health check actual tiene un timeout de
2 segundos. Distingue arranque en frío de una caída persistente al configurar alertas.

## Recuperación

Guarda el commit y la imagen de cada versión. Antes de migrar, revisa el SQL y
verifica backups. Revertir el código no revierte las migraciones: comprueba que
la versión anterior sea compatible. Para cambios incompatibles prepara una
migración correctiva o restauración probada; no ejecutes resets sobre producción.

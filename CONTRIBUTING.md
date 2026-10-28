# Contribuir a ApexDrive

1. Usa Node.js 24 y `npm ci`.
2. Copia `.env.example` a `.env` y configura una base de desarrollo.
3. Crea una rama para cada cambio; lee `AGENTS.md` y las guías relevantes.
4. Conserva las comprobaciones de autorización en servidor y las migraciones versionadas.
5. Ejecuta lint, typecheck y unitarias. Prueba los cambios de datos con integración
   sobre una base aislada: las pruebas crean y eliminan registros.
6. Para cambios visuales, compila y ejecuta Playwright; revisa escritorio y móvil.
7. Abre un pull request con problema, cambio y validación realizada.

No uses `prisma db push` como sustituto de migraciones en producción. No subas
credenciales, datos personales ni volcados. CI usa PostgreSQL efímero y no
necesita credenciales de producción. Los informes históricos conservan su fecha.

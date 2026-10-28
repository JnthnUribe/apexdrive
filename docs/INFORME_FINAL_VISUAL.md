# Informe de entrega — ApexDrive

Fecha: 26 de octubre de 2026.

## Resultado

Rediseño implementado en `C:/Users/jonat/Documents/apexdrive`. `web-carros` es la versión anterior y permanece como referencia. La portada dejó de ser un informe de fases técnicas y pasó a ser una experiencia editorial de exploración de autos. No se publicó en un dominio ni se configuraron cuentas externas.

## Cambios entregados

- Identidad visual azul y blanca, tipografía Manrope, logotipo vectorial y favicon.
- Dos imágenes de campaña originales generadas con IA, guardadas dentro del proyecto en WebP y servidas mediante next/image.
- Portada responsive con fotografía protagonista, búsqueda, categorías, publicaciones recientes, promoción de venta y preguntas frecuentes desplegables.
- Búsqueda conectada a `/cars`, con texto, marca y presupuesto. Omite parámetros vacíos para evitar filtros numéricos inválidos.
- Navegación de escritorio y menú móvil, indicador de ruta actual, cierre con Escape y recuperación del foco.
- Cabecera y pie compartidos en la aplicación; acceso a catálogo, comparador, cuenta y venta.
- Catálogo con nueva cabecera, filtros plegables, opciones en español y tarjetas revisadas. Año máximo actualizado dinámicamente.
- Login y registro con composición de dos columnas en escritorio y formulario compacto en móvil.
- Página `/como-funciona` con explicación de exploración, comparación, favoritos, venta y límites actuales.
- Estados vacíos y textos de indisponibilidad más comprensibles; retirada de referencias a fases del contenido comercial revisado.
- Imagen social, descripción de portada, favicon y sitemap actualizado.
- Pruebas Playwright y axe de páginas públicas, agregadas a CI. Las imágenes IA nunca sustituyen fotos de inventario.

## Funcionalidades y estado real

| Funcionalidad | Evidencia y estado |
| --- | --- |
| Portada, navegación, categorías y FAQ | Operativas y verificadas en navegador. |
| Búsqueda y filtros | Navegación y conservación de valores verificadas. Consulta de inventario requiere Postgres; no hay catálogo operativo en este entorno. |
| Fichas, galerías, especificaciones y relacionados | Implementados en el código existente. No verificados con inventario real en esta entrega por ausencia de DB. |
| Comparador de 2–4 autos | Implementado; entrada vacía y navegación verificadas. Datos reales y guardado requieren DB/cuenta. |
| Cuenta y perfil | Formularios implementados. Protección de rutas anónimas verificada; registro/login efectivos requieren DB y AUTH_SECRET. |
| Google OAuth | Integración existente; deshabilitada sin configuración del proveedor. No verificada de extremo a extremo. |
| Recuperación de contraseña | Código y pantallas existentes; necesita DB y correo SMTP para entrega real. |
| Favoritos y comparativas guardadas | Implementados; pendientes de prueba con usuario autenticado y DB real. |
| Historial local | Implementado mediante localStorage; no sustituye persistencia de cuenta. |
| Publicación en ocho pasos | Implementada para SELLER/ADMIN, con borrador y revisión. Pendiente de validación end-to-end con DB. |
| Gestión de publicaciones | Editar por estado, archivar y marcar vendido implementados; pendiente de comprobación con datos reales. |
| Administración | Moderación, usuarios, reportes y auditoría existentes. Redirección de anónimos verificada; acciones administrativas no verificadas en vivo. |
| Contacto comprador–vendedor | Pendiente: no hay flujo de mensajería operativo en la interfaz. |
| Habilitación de vendedores | No hay onboarding autónomo completo. Nuevas cuentas comienzan como compradores; requiere gestión administrativa. |
| Subida de fotos | Se conserva el mecanismo provisional de URLs; no hay pipeline completo de subida binaria a R2. |
| Pagos, reservas o financiamiento | No implementados en ApexDrive. La calculadora de la versión antigua no constituye una función migrada. |

## Verificación ejecutada

- `npm run lint`: sin errores.
- `npm run typecheck`: sin errores.
- `npm test`: 84 pruebas unitarias aprobadas en 20 suites.
- `npm run build`: compilación de producción exitosa con Next.js 16.4.3.
- `npm run test:e2e`: 22 aprobadas; 2 omisiones intencionales de casos exclusivos de móvil en el proyecto escritorio.
- Axe: sin infracciones detectadas para las etiquetas WCAG A/AA seleccionadas en portada, catálogo, login, registro, comparador y cómo funciona, en escritorio y móvil. No equivale a una certificación integral de accesibilidad.
- Verificación de ausencia de overflow horizontal, incluyendo 320 px en portada, catálogo, login y comparador.
- Búsqueda con presupuesto, búsqueda vacía, enlace de eléctricos y limpieza de filtros probados.
- Menú móvil, cierre con Escape y retorno del foco probados.
- Redirección de visitantes anónimos desde cuenta, venta y administración probada.
- Imágenes cargadas y ausencia de excepciones JavaScript en la prueba de portada verificadas.
- Integración: 29 pruebas omitidas en cinco suites porque no hay DATABASE_URL. No se cuentan como aprobadas.
- Capturas reproducibles en `docs/screenshots/` y reporte navegable en `playwright-report/index.html` después de ejecutar los E2E.

No se ejecutaron flujos autenticados contra una base real, pruebas de correo/OAuth, Lighthouse ni mediciones de rendimiento de campo. Los objetivos de rendimiento están en DESIGN_DIRECTION.md.

## Dependencias y riesgos de lanzamiento

La auditoría inicial encontró 13 alertas: 1 crítica, 10 altas y 2 moderadas. Se actualizó Next.js y eslint-config-next a 16.4.3 y se aplicaron correcciones compatibles con `npm audit fix`. Resultado final: **0 críticas, 7 altas, 0 moderadas**.

Quedan alertas en las cadenas de Nodemailer/Auth.js y deepmerge-ts/Prisma. No se ejecutó `audit fix --force`, que propone cambios incompatibles y hasta retroceder la autenticación a una versión mayor antigua. El detalle está en `dependency-audit.json`; requiere una revisión separada de compatibilidad antes de producción.

## Qué falta para lanzamiento

1. Provisionar Postgres, aplicar migraciones y validar los flujos con datos reales.
2. Configurar AUTH_SECRET, URL pública, SMTP y OAuth si se ofrecerá acceso con Google.
3. Resolver las alertas de dependencias restantes y verificar la seguridad con configuración de producción.
4. Completar contacto con vendedores, habilitación de vendedores y subida de fotos si forman parte del lanzamiento.
5. Ejecutar E2E autenticados de comprador, vendedor y administrador; medir rendimiento en móvil.
6. Definir dominio, HTTPS, respaldos, monitoreo y documentación legal del operador antes de publicar.

## Feedback

La presentación ahora tiene una identidad consistente y los autos tienen protagonismo. La portada funciona como entrada comercial y no como exposición de decisiones técnicas. La principal limitación del producto ya no es la portada: faltan servicios configurados y cerrar el recorrido de contacto/venta. El rediseño está entregado; la aplicación completa **todavía no está lista para operar en producción**.

## Cómo revisar y repetir las pruebas

Desde `C:/Users/jonat/Documents/apexdrive`:

```powershell
npm run build
npm run start -- --port 3000
```

Abrir `http://localhost:3000`. Sin servicios configurados se muestra el estado honesto de catálogo no disponible.

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Playwright usa Microsoft Edge en Windows y Chromium en CI. En otros entornos ejecutar primero `npx playwright install chromium`; se puede elegir canal mediante PLAYWRIGHT_CHANNEL. Los tests usan puerto 3100 y una clave efímera exclusivamente de pruebas; no habilitan cuentas de producción.

Skills de GitHub instaladas y aplicadas: frontend-design y senior-frontend. Concepto, supuestos, objetivos, archivos de imágenes y prompts completos en DESIGN_DIRECTION.md.

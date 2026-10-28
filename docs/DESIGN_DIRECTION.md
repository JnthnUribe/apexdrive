# ApexDrive — dirección visual

## Concepto

Campaña automotriz mexicana: una carretera como comienzo de una historia personal. Fotografías grandes, ritmo de revista y herramientas de búsqueda tranquilas. La referencia «como en Instagram» se interpretó como calidad de campaña/editorial; no se recibió un reel o una captura para replicar un diseño exacto.

## Sistema

- Azul de acción `#2355DC`, tinta `#162D43`, texto secundario `#5E6D7B`, divisores `#DCE3E9`, fondo `#F3F6F8`, blanco `#FFFFFF`.
- Manrope con carga y alojamiento mediante next/font. Titulares amplios de peso medio, texto funcional legible.
- Portada: título y breve introducción → foto panorámica → búsqueda superpuesta → beneficios → colecciones → inventario real → vender → preguntas frecuentes.
- Alineación izquierda para lectura y formularios. Dos columnas editoriales que pasan a una en móvil. No hay carruseles automáticos ni animaciones de scroll obligatorias.
- Se sustituyó la idea de una interfaz oscura deportiva genérica por superficies claras y azul coherente con el coupé y el océano. El protagonismo está en la foto; el resto facilita la búsqueda.
- La información técnica de fases y salud del sistema se retiró de la portada comercial. El endpoint de salud sigue disponible para operaciones.

## Supuestos y objetivos

Dispositivo principal: móvil con 4G. Sitio público dependiente de SEO, con áreas privadas de cuenta/vendedor/admin. Se conserva Next.js y Server Components; islas cliente para controles interactivos. Responsable de revisión técnica en esta entrega: Codex; responsable permanente de accesibilidad del producto pendiente de designación.

Objetivos, no mediciones de campo: LCP p75 ≤2500 ms, INP p75 ≤200 ms, CLS p75 ≤0.1; JS inicial ≤200 KB gzip incluyendo framework y código específico por ruta ≤80 KB gzip; Lighthouse móvil rendimiento ≥90 y accesibilidad ≥95; WCAG 2.2 AA. No se afirma cumplimiento integral de WCAG ni de Core Web Vitals a partir de axe. Lighthouse, presupuesto de bundle y métricas de campo pendientes de medición.

## Skills utilizadas

- frontend-design: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- senior-frontend: https://github.com/alirezarezvani/claude-skills/tree/main/engineering-team/skills/senior-frontend
- skill-installer para instalación; imagegen integrado para los originales raster.

Ambas skills de GitHub quedaron instaladas en `C:/Users/jonat/.codex/skills/` y disponibles para siguientes turnos. No se cambió la arquitectura ni se creó un proyecto alternativo.

## Imágenes

Generadas con la herramienta integrada imagegen. Se conservaron los originales y se exportaron copias WebP optimizadas con Sharp, sin alteración creativa. Ambas se identifican como IA y no se usan como fotos de vehículos anunciados.

| Archivo relativo a la app | Resolución | Peso |
| --- | --- | --- |
| public/images/coastal-coupe.webp | 1774 × 887 | 267040 bytes |
| public/images/baja-suv.webp | 1400 × 933 | 153610 bytes |

Prompt original del coupé:

> Use case: ads-marketing. Create a premium photoreal automotive campaign photograph for Mexican automotive marketplace ApexDrive. Wide landscape 1536x1024 or wider. A beautiful unbranded metallic cobalt blue sports coupe parked on a coastal concrete overlook, dramatic Pacific cliffs and calm blue sea, hazy silver-blue sky, early morning directional sun, analog automotive magazine art direction, physically accurate wheels and body, front three-quarter view with entire car visible. Car on the RIGHT two thirds of composition, left quarter shows open scenery. Camera low, generous scenery above vehicle, tasteful cinematic premium photography, natural not exaggerated HDR. No text, no logos, no watermarks, no license plate lettering, no people. This is an editorial concept vehicle, not a depiction of inventory. Save output for integration into local Next.js project.

Prompt original del SUV:

> Use case: ads-marketing. Premium automotive editorial photography for ApexDrive website, wide horizontal composition. A pearl white unbranded luxury SUV parked next to minimalist white concrete architecture in Baja California, a tall palm tree and dramatic shadows, pale blue sky, warm late afternoon light. Front three-quarter view, full vehicle visible centrally, beautiful realistic materials, refined automobile magazine photography. No people, no logos, no text, no watermark. Distinct from sports coupe, tall sophisticated family SUV. Conceptual editorial image, not actual inventory.

-- Migración 0005_report_dedupe: un solo reporte ABIERTO por usuario+listing.
-- Índice único parcial (Prisma no expresa WHERE en @@index: se declara aquí y
-- se documenta en el modelo Report; no agregar @@index equivalente).
-- Carrera doble-submit: el segundo create falla con P2002 → la acción responde
-- CONFLICT honesto (ver features/reports/actions.ts).

CREATE UNIQUE INDEX "Report_open_user_listing_uidx"
  ON "Report"("reporterId", "listingId")
  WHERE "status" = 'OPEN' AND "reporterId" IS NOT NULL;

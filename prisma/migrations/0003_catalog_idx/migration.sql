-- Migración 0003_catalog_idx: índices compuestos para filtros combinados (Fase 3).
-- Análisis: el catálogo siempre filtra status='PUBLISHED' (baja selectividad sola).
-- Los compuestos liderados por status permiten Index Scan en las combinaciones
-- más comunes: marca+precio y carrocería+combustible. `map:` en schema.prisma
-- mantiene sincronía para futuros `migrate diff` (no duplicar).
-- Nombres idénticos a los declarados con `map` en el schema.

CREATE INDEX "Listing_status_brand_price_idx" ON "Listing"("status", "brandId", "priceMXN");
CREATE INDEX "Listing_status_body_fuel_idx" ON "Listing"("status", "bodyType", "fuel");

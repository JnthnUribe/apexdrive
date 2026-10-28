-- Migración 0004_publish: publicación por pasos (Fase 4).
-- Los campos que se llenan después del paso 1 pasan a NULLABLE: el borrador
-- se construye incrementalmente y la completitud la garantiza el gate de
-- publicación en código (assertPublishable) + CHECKs existentes (NULL pasa).
-- PUBLISHED siempre completo por construcción; queries lo aseguran en voz alta.
-- `features`: características libres del paso 3 (array nativo, sin tabla extra).

ALTER TABLE "Listing" ALTER COLUMN "priceMXN" DROP NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "mileageKm" DROP NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "fuel" DROP NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "transmission" DROP NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "bodyType" DROP NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Listing" ADD COLUMN "features" TEXT[] NOT NULL DEFAULT '{}';

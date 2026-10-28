/**
 * ApexDrive seed — datos de DESARROLLO, claramente marcados (isSeed: true).
 * Coherentes MX: precios en MXN, ciudades reales, sin placas ni datos personales reales.
 * Idempotente: upserts por slug/email. Usuarios demo solo si hay DEMO_*_PASSWORD en env.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../lib/format.js";

const db = new PrismaClient();

const BRANDS: Array<{ name: string; models: string[] }> = [
  { name: "Toyota", models: ["Corolla", "RAV4", "Hilux"] },
  { name: "Honda", models: ["Civic", "CR-V"] },
  { name: "Mazda", models: ["Mazda3", "CX-5"] },
  { name: "Nissan", models: ["Versa", "NP300", "X-Trail"] },
  { name: "Volkswagen", models: ["Vento", "Tiguan"] },
  { name: "Ford", models: ["Mustang", "Ranger"] },
  { name: "Chevrolet", models: ["Onix", "Silverado"] },
  { name: "BMW", models: ["Serie 3", "X3"] },
  { name: "Mercedes-Benz", models: ["Clase C", "GLC"] },
  { name: "Audi", models: ["A4", "Q5"] },
  { name: "Tesla", models: ["Model 3", "Model Y"] },
  { name: "Porsche", models: ["911", "Macan"] },
];

type SeedListing = {
  brand: string;
  model: string;
  version: string;
  year: number;
  priceMXN: number;
  mileageKm: number;
  fuel: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
  transmission: "MANUAL" | "AUTOMATIC" | "CVT";
  body: "SEDAN" | "SUV" | "COUPE" | "HATCHBACK" | "PICKUP" | "SPORT";
  condition: "NEW" | "USED" | "CERTIFIED";
  city: string;
};

const LISTINGS: SeedListing[] = [
  { brand: "Toyota", model: "Corolla", version: "LE Híbrido", year: 2023, priceMXN: 389000, mileageKm: 32000, fuel: "HYBRID", transmission: "CVT", body: "SEDAN", condition: "USED", city: "Mérida" },
  { brand: "Toyota", model: "RAV4", version: "XLE", year: 2022, priceMXN: 529000, mileageKm: 45000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SUV", condition: "USED", city: "CDMX" },
  { brand: "Honda", model: "Civic", version: "Touring", year: 2024, priceMXN: 589000, mileageKm: 8000, fuel: "PETROL", transmission: "CVT", body: "SEDAN", condition: "CERTIFIED", city: "Guadalajara" },
  { brand: "Honda", model: "CR-V", version: "EX", year: 2021, priceMXN: 469000, mileageKm: 62000, fuel: "PETROL", transmission: "CVT", body: "SUV", condition: "USED", city: "Monterrey" },
  { brand: "Mazda", model: "Mazda3", version: "Signature", year: 2023, priceMXN: 459000, mileageKm: 21000, fuel: "PETROL", transmission: "AUTOMATIC", body: "HATCHBACK", condition: "USED", city: "Mérida" },
  { brand: "Mazda", model: "CX-5", version: "Grand Touring", year: 2024, priceMXN: 629000, mileageKm: 5000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SUV", condition: "CERTIFIED", city: "Puebla" },
  { brand: "Nissan", model: "Versa", version: "Exclusive", year: 2022, priceMXN: 289000, mileageKm: 38000, fuel: "PETROL", transmission: "CVT", body: "SEDAN", condition: "USED", city: "CDMX" },
  { brand: "Nissan", model: "NP300", version: "LE Doble Cabina", year: 2023, priceMXN: 519000, mileageKm: 27000, fuel: "DIESEL", transmission: "MANUAL", body: "PICKUP", condition: "USED", city: "Villahermosa" },
  { brand: "Volkswagen", model: "Vento", version: "Highline", year: 2021, priceMXN: 259000, mileageKm: 55000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SEDAN", condition: "USED", city: "Toluca" },
  { brand: "Volkswagen", model: "Tiguan", version: "Comfortline", year: 2023, priceMXN: 599000, mileageKm: 19000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SUV", condition: "USED", city: "Querétaro" },
  { brand: "Ford", model: "Mustang", version: "GT Fastback", year: 2022, priceMXN: 989000, mileageKm: 15000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SPORT", condition: "USED", city: "CDMX" },
  { brand: "Ford", model: "Ranger", version: "XLT Diésel 4x4", year: 2024, priceMXN: 799000, mileageKm: 3000, fuel: "DIESEL", transmission: "AUTOMATIC", body: "PICKUP", condition: "NEW", city: "Monterrey" },
  { brand: "Chevrolet", model: "Onix", version: "Premier", year: 2023, priceMXN: 319000, mileageKm: 24000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SEDAN", condition: "USED", city: "Mérida" },
  { brand: "Chevrolet", model: "Silverado", version: "Trail Boss", year: 2022, priceMXN: 949000, mileageKm: 41000, fuel: "PETROL", transmission: "AUTOMATIC", body: "PICKUP", condition: "USED", city: "Chihuahua" },
  { brand: "BMW", model: "Serie 3", version: "330i", year: 2023, priceMXN: 849000, mileageKm: 18000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SEDAN", condition: "CERTIFIED", city: "CDMX" },
  { brand: "BMW", model: "X3", version: "xDrive30i", year: 2022, priceMXN: 899000, mileageKm: 33000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SUV", condition: "USED", city: "Guadalajara" },
  { brand: "Mercedes-Benz", model: "Clase C", version: "C 200", year: 2023, priceMXN: 929000, mileageKm: 12000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SEDAN", condition: "CERTIFIED", city: "CDMX" },
  { brand: "Mercedes-Benz", model: "GLC", version: "300 4MATIC", year: 2024, priceMXN: 1149000, mileageKm: 4000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SUV", condition: "NEW", city: "Monterrey" },
  { brand: "Audi", model: "A4", version: "S line", year: 2022, priceMXN: 799000, mileageKm: 29000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SEDAN", condition: "USED", city: "Puebla" },
  { brand: "Audi", model: "Q5", version: "Sportback", year: 2023, priceMXN: 999000, mileageKm: 16000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SUV", condition: "CERTIFIED", city: "CDMX" },
  { brand: "Tesla", model: "Model 3", version: "Long Range", year: 2024, priceMXN: 749000, mileageKm: 6000, fuel: "ELECTRIC", transmission: "AUTOMATIC", body: "SEDAN", condition: "CERTIFIED", city: "CDMX" },
  { brand: "Tesla", model: "Model Y", version: "Performance", year: 2023, priceMXN: 849000, mileageKm: 14000, fuel: "ELECTRIC", transmission: "AUTOMATIC", body: "SUV", condition: "USED", city: "Guadalajara" },
  { brand: "Porsche", model: "911", version: "Carrera S", year: 2021, priceMXN: 2890000, mileageKm: 22000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SPORT", condition: "USED", city: "CDMX" },
  { brand: "Porsche", model: "Macan", version: "GTS", year: 2023, priceMXN: 1790000, mileageKm: 9000, fuel: "PETROL", transmission: "AUTOMATIC", body: "SUV", condition: "CERTIFIED", city: "Monterrey" },
];

async function main(): Promise<void> {
  // Catálogo curado
  for (const b of BRANDS) {
    const brand = await db.brand.upsert({
      where: { slug: slugify(b.name) },
      update: { name: b.name },
      create: { slug: slugify(b.name), name: b.name },
    });
    for (const m of b.models) {
      await db.carModel.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: slugify(m) } },
        update: { name: m },
        create: { brandId: brand.id, slug: slugify(m), name: m },
      });
    }
  }

  // Vendedor semilla (dueño de los listings de desarrollo)
  const sellerEmail = "vendedor.demo@apexdrive.mx";
  let seller = await db.user.findUnique({ where: { email: sellerEmail }, include: { seller: true } });
  if (!seller) {
    const created = await db.user.create({
      data: {
        email: sellerEmail,
        role: "SELLER",
        profile: { create: { displayName: "Vendedora Demo (datos ficticios)" } },
        seller: { create: { tradeName: "Demo Motors", verified: true } },
      },
      include: { seller: true },
    });
    seller = created;
  }
  const sellerId = seller.seller?.id;
  if (!sellerId) throw new Error("Seed: no se pudo crear el vendedor demo");

  for (const l of LISTINGS) {
    const brand = await db.brand.findUniqueOrThrow({ where: { slug: slugify(l.brand) } });
    const model = await db.carModel.findUniqueOrThrow({
      where: { brandId_slug: { brandId: brand.id, slug: slugify(l.model) } },
    });
    const slug = slugify(`${l.brand} ${l.model} ${l.version} ${l.year}`.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, ""));
    await db.listing.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        sellerId,
        brandId: brand.id,
        carModelId: model.id,
        title: `${l.brand} ${l.model} ${l.version} ${l.year}`,
        version: l.version,
        year: l.year,
        priceMXN: l.priceMXN,
        mileageKm: l.mileageKm,
        fuel: l.fuel,
        transmission: l.transmission,
        bodyType: l.body,
        condition: l.condition,
        city: l.city,
        description: `Unidad de demostración (seed): ${l.brand} ${l.model} ${l.version}, año ${l.year}, ${l.city}. Datos ficticios para desarrollo.`,
        status: "PUBLISHED",
        publishedAt: new Date(),
        isSeed: true,
      },
    });
  }

  // Usuarios demo por rol — NUNCA con credenciales en el repo.
  const demos = [
    { email: "admin.demo@apexdrive.mx", role: "ADMIN" as const, envKey: "DEMO_ADMIN_PASSWORD" },
    { email: "usuario.demo@apexdrive.mx", role: "USER" as const, envKey: "DEMO_USER_PASSWORD" },
  ];
  for (const d of demos) {
    const password = process.env[d.envKey];
    if (!password) {
      console.warn(`Seed: ${d.envKey} ausente — usuario ${d.email} omitido (correcto en CI).`);
      continue;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.upsert({
      where: { email: d.email },
      update: { role: d.role },
      create: {
        email: d.email,
        passwordHash,
        role: d.role,
        profile: { create: { displayName: `Demo ${d.role} (datos ficticios)` } },
      },
    });
  }

  console.log(`Seed OK: ${BRANDS.length} marcas, ${LISTINGS.length} listings (isSeed=true).`);
}

main()
  .catch((e) => {
    console.error("Seed falló:", e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });

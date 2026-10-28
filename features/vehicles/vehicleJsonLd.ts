import type { VehicleDetail } from "./queries";

// JSON-LD schema.org/Car para la página de detalle (SEO). Solo datos reales
// del registro; jamás inventa equipamiento ni precios.

export function buildVehicleJsonLd(vehicle: VehicleDetail, baseUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: vehicle.title,
    brand: { "@type": "Brand", name: vehicle.brand.name },
    model: vehicle.carModel.name,
    vehicleModelDate: String(vehicle.year),
    bodyType: vehicle.bodyType ?? undefined,
    fuelType: vehicle.fuel ?? undefined,
    vehicleTransmission: vehicle.transmission ?? undefined,
    color: vehicle.exteriorColor ?? undefined,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: vehicle.mileageKm ?? 0,
      unitCode: "KMT",
    },
    offers: {
      "@type": "Offer",
      price: vehicle.priceMXN ?? 0,
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/cars/${vehicle.slug}`,
    },
  };
}

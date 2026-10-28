import { describe, expect, it } from "vitest";
import { buildVehicleJsonLd } from "@/features/vehicles/vehicleJsonLd";
import type { VehicleDetail } from "@/features/vehicles/queries";

const vehicle = {
  slug: "bmw-x3-2022",
  title: "BMW X3 xDrive30i 2022",
  year: 2022,
  priceMXN: 899000,
  mileageKm: 33000,
  fuel: "PETROL",
  transmission: "AUTOMATIC",
  bodyType: "SUV",
  exteriorColor: "Negro",
  brand: { name: "BMW", slug: "bmw" },
  carModel: { name: "X3", slug: "x3" },
} as VehicleDetail;

describe("buildVehicleJsonLd", () => {
  it("emite schema.org/Car con datos reales, sin inventar", () => {
    const json = buildVehicleJsonLd(vehicle, "https://apexdrive.mx");
    expect(json["@type"]).toBe("Car");
    expect(json).toMatchObject({
      name: "BMW X3 xDrive30i 2022",
      vehicleModelDate: "2022",
      offers: {
        "@type": "Offer",
        price: 899000,
        priceCurrency: "MXN",
        url: "https://apexdrive.mx/cars/bmw-x3-2022",
      },
    });
    const mileage = json["mileageFromOdometer"] as Record<string, unknown>;
    expect(mileage["value"]).toBe(33000);
    expect(mileage["unitCode"]).toBe("KMT");
  });
});

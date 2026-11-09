import { z } from "zod";
import { innovaPricingReference } from "./innova-pricing-reference";

export const distancePricingSchema = z.object({
  enabled: z.boolean().default(false),
  perKmMinor: z.number().int().min(0).max(100000000).default(0),
  originAddress: z.string().trim().max(300).default(""),
  mode: z.enum(["DISTANCE_ONLY", "ADD_TO_REFERENCE"]).default("DISTANCE_ONLY"),
  roundTrip: z.boolean().default(false),
}).refine(value => !value.enabled || (value.perKmMinor > 0 && value.originAddress.length >= 3), "Enter a positive kilometer rate and the full base pickup address to enable distance pricing.");
export type DistancePricing = z.infer<typeof distancePricingSchema>;
export const supportsDriverDistancePricing = (name: string) => /innova|veloz/i.test(name);
export function distancePricingConfig(value: unknown): DistancePricing {
  const parsed = distancePricingSchema.safeParse(value);
  return parsed.success ? parsed.data : { enabled: false, perKmMinor: 0, originAddress: "", mode: "DISTANCE_ONLY", roundTrip: false };
}
export function rentalDurationHours(start: string, end: string, pickupTime: string, dropoffTime: string): number {
  return (Date.parse(`${end}T${dropoffTime}:00+08:00`) - Date.parse(`${start}T${pickupTime}:00+08:00`)) / 3600000;
}
export function destinationReferenceIndex(destination: string): number | null {
  const text = destination.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\bdasmarinas\b/.test(text)) return 0;
  if (/\bcavite\b/.test(text)) return 1;
  if (/\b(laguna|batangas|rizal)\b/.test(text)) return 2;
  if (/metro manila|metropolitan manila|national capital region/.test(text)) return 3;
  if (/\b(bulacan|pampanga|bataan|zambales|nueva ecija|tarlac)\b/.test(text)) return 4;
  return null;
}
export function calculateDistancePrice({ distanceMeters, durationHours, destination, config, feeMinor, depositMinor, useReferenceRates = true }: { distanceMeters: number; durationHours: number; destination: string; config: DistancePricing; feeMinor: number; depositMinor: number; useReferenceRates?: boolean }) {
  if (!config.enabled || !Number.isFinite(distanceMeters) || distanceMeters < 0 || !Number.isFinite(durationHours) || durationHours <= 0) throw new Error("Distance pricing is unavailable.");
  if (durationHours > 24) return { status: "QUOTATION_REQUIRED" as const, reason: "Trips longer than 24 hours require an admin quotation." };
  const area = destinationReferenceIndex(destination);
  if (area === null) return { status: "QUOTATION_REQUIRED" as const, reason: "Long-distance and provincial destinations require an admin quotation." };
  const rate = innovaPricingReference[area];
  const baseMinor = useReferenceRates && config.mode === "ADD_TO_REFERENCE" ? (durationHours <= 12 ? rate.hours12Minor : rate.hours24Minor) : 0;
  const distanceMinor = Math.round(distanceMeters * (config.roundTrip ? 2 : 1) * config.perKmMinor / 1000);
  const totalMinor = baseMinor + distanceMinor + feeMinor + depositMinor;
  if (!Number.isSafeInteger(totalMinor) || totalMinor <= 0 || totalMinor > 2147483647) throw new Error("The calculated price is outside the supported range.");
  return { status: "READY" as const, baseMinor, distanceMinor, feeMinor, depositMinor, totalMinor, area: rate.area, billedKm: distanceMeters * (config.roundTrip ? 2 : 1) / 1000 };
}

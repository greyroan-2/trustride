import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateDistancePrice, destinationReferenceIndex, distancePricingConfig, distancePricingSchema, rentalDurationHours } from "../src/lib/distance-pricing";
import { pesoAmount } from "../src/lib/validation";

const config = distancePricingSchema.parse({ enabled: true, perKmMinor: 2000, originAddress: "Dasmariñas City, Cavite", mode: "DISTANCE_ONLY", roundTrip: false });
test("admin kilometer settings require a real rate and origin; zero additional fee is valid", () => {
  assert.equal(pesoAmount.parse("0"), 0);
  assert.equal(pesoAmount.parse("0.00"), 0);
  assert.equal(distancePricingSchema.safeParse({ enabled: true, perKmMinor: 0, originAddress: "" }).success, false);
  assert.equal(distancePricingConfig({}).enabled, false);
});
test("distance-only formula uses road meters, optional round trip, and snapshot fees", () => {
  const oneWay = calculateDistancePrice({ distanceMeters: 12500, durationHours: 12, destination: "Tagaytay, Cavite", config, feeMinor: 0, depositMinor: 50000 });
  assert.equal(oneWay.status, "READY");
  if (oneWay.status !== "READY") return;
  assert.equal(oneWay.distanceMinor, 25000);
  assert.equal(oneWay.totalMinor, 75000);
  const round = calculateDistancePrice({ distanceMeters: 12500, durationHours: 12, destination: "Tagaytay, Cavite", config: { ...config, roundTrip: true }, feeMinor: 10000, depositMinor: 0 });
  assert.equal(round.status === "READY" && round.totalMinor, 60000);
});
test("reference-plus-distance pricing uses the supplied Innova 12 and 24-hour rates", () => {
  const quote = (hours: number) => calculateDistancePrice({ distanceMeters: 10000, durationHours: hours, destination: "Dasmariñas, Cavite", config: { ...config, mode: "ADD_TO_REFERENCE" }, feeMinor: 0, depositMinor: 0 });
  const short = quote(12), day = quote(24);
  assert.equal(short.status === "READY" && short.totalMinor, 270000);
  assert.equal(day.status === "READY" && day.totalMinor, 370000);
  assert.equal(quote(24.01).status, "QUOTATION_REQUIRED");
  assert.equal(calculateDistancePrice({ distanceMeters: 100000, durationHours: 12, destination: "Baguio, Benguet", config, feeMinor: 0, depositMinor: 0 }).status, "QUOTATION_REQUIRED");
});
test("reference areas and overnight pickup/drop-off times are classified correctly", () => {
  for (const [text, expected] of [["Dasmariñas, Cavite", 0], ["Tagaytay, Cavite", 1], ["Batangas City, Batangas", 2], ["Makati, Metro Manila", 3], ["Angeles, Pampanga", 4]] as const) assert.equal(destinationReferenceIndex(text), expected);
  assert.equal(rentalDurationHours("2026-11-09", "2026-11-10", "21:00", "09:00"), 12);
  assert.equal(rentalDurationHours("2026-11-09", "2026-11-10", "09:00", "09:00"), 24);
});
test("Veloz distance pricing never inherits Innova reference prices", () => {
  const quote = calculateDistancePrice({ distanceMeters: 10000, durationHours: 12, destination: "Dasmariñas, Cavite", config: { ...config, mode: "ADD_TO_REFERENCE" }, feeMinor: 0, depositMinor: 0, useReferenceRates: false });
  assert.equal(quote.status, "READY");
  if (quote.status === "READY") {
    assert.equal(quote.baseMinor, 0);
    assert.equal(quote.totalMinor, 20000);
  }
});

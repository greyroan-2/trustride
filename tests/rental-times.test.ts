import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRentalTime, rentalTimesSchema } from "../src/lib/rental-times";

test("pickup and drop-off times are required and validated independently", () => {
  assert.deepEqual(rentalTimesSchema.parse({ pickupTime: "09:30", dropoffTime: "17:45" }), { pickupTime: "09:30", dropoffTime: "17:45" });
  for (const invalid of ["24:00", "12:60", "9:00", "", "09:00 PM"]) {
    assert.equal(rentalTimesSchema.safeParse({ pickupTime: invalid, dropoffTime: "09:00" }).success, false);
    assert.equal(rentalTimesSchema.safeParse({ pickupTime: "09:00", dropoffTime: invalid }).success, false);
  }
  assert.equal(rentalTimesSchema.safeParse({ pickupTime: "09:00" }).success, false);
  assert.equal(rentalTimesSchema.safeParse({ pickupTime: "23:30", dropoffTime: "01:00" }).success, true);
});
test("display times handle midnight, noon, and legacy missing values", () => {
  assert.equal(formatRentalTime("00:00"), "12:00 AM");
  assert.equal(formatRentalTime("12:00"), "12:00 PM");
  assert.equal(formatRentalTime("23:45"), "11:45 PM");
  assert.equal(formatRentalTime(), "Not provided");
});

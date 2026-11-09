import { test } from "node:test";
import assert from "node:assert/strict";
import { governmentIdTypeSchema, travelDetailsSchema, selfDriveDocuments, workflowData } from "../src/lib/booking-workflow";

const trip = { contactName: " Customer ", phone: "+639123456789", pickupLocation: "Manila", destination: "Tagaytay", pickupTime: "09:30", dropoffTime: "17:00", passengers: "3" };
test("travel details normalize contact names and passenger counts", () => {
  const parsed = travelDetailsSchema.parse(trip);
  assert.equal(parsed.contactName, "Customer");
  assert.equal(parsed.passengers, 3);
});
test("travel details reject missing locations, invalid times, and zero passengers", () => {
  for (const invalid of [{ pickupLocation: " " }, { destination: "" }, { pickupTime: "25:00" }, { passengers: "0" }]) {
    assert.equal(travelDetailsSchema.safeParse({ ...trip, ...invalid }).success, false);
  }
});
test("self-drive submission requires a license, one additional ID, LTMS, and billing", () => {
  assert.deepEqual(selfDriveDocuments.map(document => document.key), ["license", "governmentId1", "ltms", "billing"]);
});
test("additional ID types accept listed IDs and exclude driver’s licenses", () => {
  assert.equal(governmentIdTypeSchema.safeParse("Philippine Passport").success, true);
  assert.equal(governmentIdTypeSchema.safeParse("Driver’s license").success, false);
  assert.equal(governmentIdTypeSchema.safeParse("").success, false);
});
test("legacy reservations without saved progress start with empty details", () => {
  assert.deepEqual(workflowData(null), {});
  assert.deepEqual(workflowData([]), {});
});
test("contact number requires +63 and rejects negative, alphabetic, or excessive digits", () => {
  for (const phone of ["-09123456789", "+63abc1234567", "+63123456789012", "09123456789"]) {
    assert.equal(travelDetailsSchema.safeParse({ ...trip, phone }).success, false);
  }
  assert.equal(travelDetailsSchema.safeParse({ ...trip, phone: "+6312345678901" }).success, true);
});

test("with-driver bookings require an allowed ID type and an uploaded ID", async () => {
  const { hasRequiredDriverId, driverIdTypeSchema } = await import("../src/lib/booking-workflow");
  const document = { path: "customer/booking/id.jpg", name: "id.jpg", uploadedAt: "2026-11-08T00:00:00Z" };
  assert.equal(hasRequiredDriverId({ service: "WITH_DRIVER" }), false);
  assert.equal(hasRequiredDriverId({ service: "WITH_DRIVER", driverIdType: "Philippine Passport" }), false);
  assert.equal(hasRequiredDriverId({ service: "WITH_DRIVER", documents: { driverValidId: document } }), false);
  assert.equal(hasRequiredDriverId({ service: "WITH_DRIVER", driverIdType: "Unknown ID", documents: { driverValidId: document } }), false);
  assert.equal(hasRequiredDriverId({ service: "WITH_DRIVER", driverIdType: "Philippine Passport", documents: { driverValidId: document } }), true);
  assert.equal(driverIdTypeSchema.safeParse("Driver's license").success, true);
  assert.equal(hasRequiredDriverId({ service: "SELF_DRIVE" }), true);
});

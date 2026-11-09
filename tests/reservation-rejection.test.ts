import { test } from "node:test";
import assert from "node:assert/strict";
import { rejectionReason, rejectionReasonSchema } from "../src/lib/reservation-rejection";

test("rejecting a request requires a nonempty reason of up to 500 characters", () => {
  for (const value of ["", "   ", "x".repeat(501), null]) assert.equal(rejectionReasonSchema.safeParse(value).success, false);
  assert.equal(rejectionReasonSchema.parse("  Dates unavailable.  "), "Dates unavailable.");
  assert.equal(rejectionReasonSchema.safeParse("x".repeat(500)).success, true);
});
test("rejection page uses the admin reason and supports previous payment review feedback", () => {
  assert.equal(rejectionReason({ rejection: { reason: "Cannot verify requirements.", rejectedAt: "2026-11-08" } }), "Cannot verify requirements.");
  const proof = { document: { path: "test", name: "receipt", uploadedAt: "2026-11-08" }, amountMinor: 100, reference: "123", method: "GCASH" as const, status: "REJECTED" as const, reviewNote: "Receipt could not be verified." };
  assert.equal(rejectionReason({ paymentProof: proof }), proof.reviewNote);
  assert.equal(rejectionReason({ paymentProof: { ...proof, status: "APPROVED" } }), null);
  assert.equal(rejectionReason({}), null);
});

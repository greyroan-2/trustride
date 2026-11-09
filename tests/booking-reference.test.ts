import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingReferencePattern, bookingReferencePrefix, formatBookingReference } from "../src/lib/booking-reference";

test("references use the Manila creation date and a numeric suffix", () => {
  const prefix = bookingReferencePrefix(new Date("2026-11-07T08:00:00Z"));
  assert.equal(formatBookingReference(prefix, 1n), "TR-2026/11/07-000001");
  assert.equal(formatBookingReference(prefix, 1000000n), "TR-2026/11/07-1000000");
  assert.throws(() => formatBookingReference(prefix, 0n));
});

test("reference date changes at midnight in Manila", () => {
  assert.equal(bookingReferencePrefix(new Date("2026-11-07T15:59:59Z")), "TR-2026/11/07-");
  assert.equal(bookingReferencePrefix(new Date("2026-11-07T16:00:00Z")), "TR-2026/11/08-");
});

test("global counter matches dated references from any day and excludes legacy references", () => {
  const pattern = new RegExp(bookingReferencePattern);
  const references = ["TR-2026/11/07-000004", "TR-2026/11/09-000001", "TR-D4C7781C-F36"];
  const numbers = references.filter(reference => pattern.test(reference)).map(reference => BigInt(reference.split("-").at(-1)!));
  const next = numbers.reduce((max, number) => number > max ? number : max, 0n) + 1n;
  assert.equal(formatBookingReference(bookingReferencePrefix(new Date("2026-11-10T01:00:00Z")), next), "TR-2026/11/10-000005");
  assert.equal(pattern.test("TR-legacy-999999"), false);
});

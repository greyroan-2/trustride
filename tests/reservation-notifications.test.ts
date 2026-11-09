import { test } from "node:test";
import assert from "node:assert/strict";
import { reservationNotification } from "../src/lib/reservation-notifications";
const booking = { id: "booking-1", reference: "TR-123", name: "Veloz", createdAt: new Date("2026-11-08T00:00:00Z") };

test("notifications contain pending, confirmed, delivered, and rejected request updates", () => {
  for (const status of ["PENDING", "CONFIRMED", "DELIVERED", "REJECTED"]) {
    const result = reservationNotification({ ...booking, status });
    assert.equal(result?.status, status);
    assert.match(result!.message, /Veloz · TR-123/);
    assert.equal(result?.bookingId, booking.id);
  }
  for (const status of ["CANCELLED", "COMPLETED", "PAID", "UNKNOWN"]) assert.equal(reservationNotification({ ...booking, status }), null);
});
test("each new reservation status has a separate unread identity", () => {
  const pending = reservationNotification({ ...booking, status: "PENDING" });
  const confirmed = reservationNotification({ ...booking, status: "CONFIRMED" });
  assert.notEqual(pending?.id, confirmed?.id);
  assert.equal(pending?.id, reservationNotification({ ...booking, status: "PENDING" })?.id);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { reservationCalendarLabel, reservationPaymentState } from "../src/lib/reservation-payment";

test("confirmed dates are reserved even when unpaid or partially paid", () => {
  const unpaid = reservationPaymentState(10000, "PHP", []);
  assert.equal(unpaid.balanceMinor, 10000);
  assert.equal(reservationCalendarLabel("CONFIRMED", unpaid.fullyPaid), "Reserved · Balance due");
  const partial = reservationPaymentState(10000, "PHP", [{ amountMinor: 3000, currency: "PHP", status: "PAID" }]);
  assert.equal(partial.balanceMinor, 7000);
  assert.equal(reservationCalendarLabel("CONFIRMED", partial.fullyPaid), "Reserved · Balance due");
});
test("only approved payments in the reservation currency count toward full payment", () => {
  const pending = reservationPaymentState(10000, "PHP", [
    { amountMinor: 10000, currency: "PHP", status: "PENDING" },
    { amountMinor: 10000, currency: "PHP", status: "REJECTED" },
    { amountMinor: 10000, currency: "USD", status: "PAID" },
  ]);
  assert.equal(pending.paidMinor, 0);
  assert.equal(pending.fullyPaid, false);
  const full = reservationPaymentState(10000, "PHP", [
    { amountMinor: 3000, currency: "PHP", status: "PAID" },
    { amountMinor: 7000, currency: "PHP", status: "PAID" },
  ]);
  assert.equal(full.balanceMinor, 0);
  assert.equal(full.fullyPaid, true);
  assert.equal(reservationCalendarLabel("CONFIRMED", full.fullyPaid), "Booked · Fully paid");
  assert.equal(reservationCalendarLabel("PENDING", full.fullyPaid), "Pending request");
});

test("delivery status is independent from payment completion",()=>{
 assert.equal(reservationCalendarLabel("DELIVERED",false),"Delivered - Balance due");
 assert.equal(reservationCalendarLabel("DELIVERED",true),"Delivered - Fully paid");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { reservationDepositError, reservationDepositMinor } from "../src/lib/reservation-deposit";

test("reservation receipts must match exactly half the total", () => {
  assert.equal(reservationDepositMinor(350000), 175000);
  assert.equal(reservationDepositError(350000, 0, 175000), null);
  for (const amount of [0, 174999, 175001, 350000]) assert.match(reservationDepositError(350000, 0, amount)!, /exactly the 50%/);
  assert.match(reservationDepositError(350000, 175000, 175000)!, /already recorded/);
  assert.equal(reservationDepositMinor(101), 51);
  assert.throws(() => reservationDepositMinor(-1));
});

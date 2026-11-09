import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice, date, reservation, pesoAmount, money } from "../src/lib/validation";
test("peso input preserves the intended amount and exact cents", () => {
  assert.equal(pesoAmount.parse("1000"), 100000);
  assert.equal(pesoAmount.parse("1000.00"), 100000);
  assert.equal(pesoAmount.parse("1.01"), 101);
  assert.equal(pesoAmount.parse("0.29"), 29);
  assert.equal(pesoAmount.parse("12.5"), 1250);
  assert.equal(pesoAmount.parse("0"), 0);
  assert.equal(pesoAmount.parse("1000000.00"), 100000000);
  assert.equal(money(pesoAmount.parse("1000")), "₱1,000.00");
});
test("peso input rejects invalid, negative, excessive, and sub-cent amounts", () => {
  for (const value of ["", "-1", "1.001", "1e3", "NaN", "1000000.01", "1,000", "0x10"])
    assert.equal(pesoAmount.safeParse(value).success, false, value);
});
test("date ranges exclude return day and preserve integer money", () => {
  assert.deepEqual(
    calculatePrice("2027-01-01", "2027-01-04", 12345, 100, 5000),
    { days: 3, subtotal: 37035, fee: 100, deposit: 5000, total: 42135 },
  );
});
test("invalid periods and unsafe amounts fail", () => {
  for (const [a, b] of [
    ["2027-01-01", "2027-01-01"],
    ["2027-01-02", "2027-01-01"],
    ["2027-01-01", "2029-01-01"],
  ])
    assert.throws(() => calculatePrice(a, b, 100, 0, 0));
  assert.throws(() => calculatePrice("2027-01-01", "2027-01-02", 1.5, 0, 0));
});
test("impossible calendar dates and reversed reservations fail", () => {
  assert.equal(date.safeParse("2027-02-30").success, false);
  assert.equal(
    reservation.safeParse({
      vehicleId: "00000000-0000-4000-8000-000000000000",
      start: "2027-01-03",
      end: "2027-01-02",
      notes: "",
    }).success,
    false,
  );
});

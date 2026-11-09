import { test } from "node:test";
import assert from "node:assert/strict";
import { transactionsOnDates } from "../src/lib/calendar-transactions";

test("date disabling detects active requests across all vehicles", () => {
  const periods = [
    { id: "a", vehicleId: "veloz", start: "2026-11-19", end: "2026-11-21", status: "PENDING" },
    { id: "b", vehicleId: "innova", start: "2026-11-20", end: "2026-11-22", status: "CONFIRMED" },
    { id: "c", vehicleId: "veloz", start: "2026-11-19", end: "2026-11-21", status: "REJECTED" },
    { id: "d", vehicleId: "veloz", start: "2026-11-19", end: "2026-11-21", status: "CANCELLED" },
  ];
  assert.deepEqual(transactionsOnDates(periods, "2026-11-20", "2026-11-21").map(item => item.id), ["a", "b"]);
  assert.deepEqual(transactionsOnDates(periods, "2026-11-21", "2026-11-22").map(item => item.id), ["b"]);
  assert.deepEqual(transactionsOnDates(periods, "2026-11-18", "2026-11-19"), []);
  assert.deepEqual(transactionsOnDates(periods, "2026-11-22", "2026-11-23"), []);
  assert.deepEqual(transactionsOnDates(periods, "", ""), []);
});

test("delivered units remain active transactions on their reserved dates",()=>{
 assert.equal(transactionsOnDates([{start:"2026-11-10",end:"2026-11-12",status:"DELIVERED"}],"2026-11-11","2026-11-12").length,1);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { deleteBookingRequest } from "../src/lib/delete-booking-request";
import { bookingReferenceLock } from "../src/lib/booking-reference";
import { canDeleteBookingRequest } from "../src/lib/request-policy";

function transaction(status: string) {
  const calls: string[] = [];
  const tx = {
    booking: {
      findUniqueOrThrow: async () => ({ vehicleId: "vehicle", status, reference: "TR-2026/11/07-000004" }),
      delete: async () => { calls.push("delete booking"); },
    },
    $queryRaw: async (sql: TemplateStringsArray) => { calls.push(sql.join("").includes('"Vehicle"') ? "lock vehicle" : "lock booking"); },
    $executeRaw: async (_sql: TemplateStringsArray, key: string) => { assert.equal(key, bookingReferenceLock); calls.push("lock reference counter"); },
    paymentRecord: { deleteMany: async () => { calls.push("delete payments"); } },
    bookingWorkflow: { deleteMany: async () => { calls.push("delete workflow"); } },
  } as unknown as Prisma.TransactionClient;
  return { tx, calls };
}
test("pending, completed, and unknown statuses cannot delete any records", async () => {
  for (const status of ["PENDING", "COMPLETED", "UNKNOWN"]) {
    const { tx, calls } = transaction(status);
    assert.equal(canDeleteBookingRequest(status), false);
    await assert.rejects(deleteBookingRequest(tx, "booking"), /Only cancelled, confirmed, or rejected/);
    assert.deepEqual(calls, ["lock vehicle", "lock booking"]);
  }
});
test("allowed requests delete dependents before the booking and return the reference for auditing", async () => {
  for (const status of ["CANCELLED", "CONFIRMED", "REJECTED"]) {
    const { tx, calls } = transaction(status);
    assert.equal(canDeleteBookingRequest(status), true);
    assert.equal(await deleteBookingRequest(tx, "booking"), "TR-2026/11/07-000004");
    assert.deepEqual(calls, ["lock vehicle", "lock booking", "lock reference counter", "delete payments", "delete workflow", "delete booking"]);
  }
});

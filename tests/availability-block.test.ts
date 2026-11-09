import { test } from "node:test";
import assert from "node:assert/strict";
import { remainingBlockedPeriods } from "../src/lib/availability-block";

const day = (value: number) => new Date(`2026-11-${String(value).padStart(2, "0")}T00:00:00Z`);
const ranges = (start: number, end: number, release: number) => remainingBlockedPeriods(day(start), day(end), day(release)).map(period => [period.startDate.getUTCDate(), period.endDate.getUTCDate()]);
test("releasing a middle day preserves both sides of a block", () => assert.deepEqual(ranges(10, 15, 12), [[10, 12], [13, 15]]));
test("releasing either boundary preserves the other blocked days", () => {
  assert.deepEqual(ranges(10, 15, 10), [[11, 15]]);
  assert.deepEqual(ranges(10, 15, 14), [[10, 14]]);
});
test("releasing a single-day block removes it completely", () => assert.deepEqual(ranges(10, 11, 10), []));
test("the exclusive end date cannot be released", () => assert.throws(() => ranges(10, 15, 15)));

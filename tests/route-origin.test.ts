import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRouteOrigin } from "../src/lib/route-origin";

test("empty saved settings use the current admin base address", () => {
  assert.deepEqual(resolveRouteOrigin({ bookingAddress: "", adminAddress: "Dasmariñas City, Cavite", pickupAddress: "Customer pickup" }), { address: "Dasmariñas City, Cavite", source: "admin" });
});
test("pickup address allows distance estimates without configured base settings", () => {
  assert.deepEqual(resolveRouteOrigin({ bookingAddress: "", adminAddress: "", environmentAddress: "", pickupAddress: "  Dasmariñas City, Cavite  " }), { address: "Dasmariñas City, Cavite", source: "pickup" });
});
test("saved base addresses retain priority and environment settings can supply a fallback", () => {
  assert.deepEqual(resolveRouteOrigin({ bookingAddress: "Saved base", adminAddress: "New base", pickupAddress: "Customer pickup" }), { address: "Saved base", source: "booking" });
  assert.deepEqual(resolveRouteOrigin({ environmentAddress: "Configured base", pickupAddress: "Customer pickup" }), { address: "Configured base", source: "environment" });
});
test("missing pickup data is reported rather than inventing an origin", () => {
  assert.equal(resolveRouteOrigin({ bookingAddress: " ", pickupAddress: "" }), null);
});

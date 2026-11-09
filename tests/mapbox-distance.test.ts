import { test } from "node:test";
import assert from "node:assert/strict";
import { drivingDistance, RouteEstimateError } from "../src/lib/mapbox-distance";

test("driving estimates use Mapbox geocoding and road distance, with storage permission for saved quotes", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.MAPBOX_ACCESS_TOKEN;
  const calls: URL[] = [];
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";
  globalThis.fetch = async input => {
    const url = new URL(String(input)); calls.push(url);
    if (url.pathname.includes("geocode")) return Response.json({ features: [{ geometry: { coordinates: url.searchParams.get("q") === "Origin" ? [120.94, 14.33] : [120.96, 14.12] }, properties: { full_address: url.searchParams.get("q"), context: { place: { name: "Tagaytay" }, region: { name: "Cavite" } } } }] });
    assert.match(url.pathname, /directions\/v5\/mapbox\/driving\//);
    return Response.json({ code: "Ok", routes: [{ distance: 12345, duration: 1200 }] });
  };
  try {
    const route = await drivingDistance("Destination", "Origin", true);
    assert.equal(route.distanceMeters, 12345);
    assert.equal(route.distanceKm, 12.3);
    assert.equal(route.durationMinutes, 20);
    assert.equal(route.destinationArea, "Tagaytay, Cavite");
    assert.equal(calls.length, 3);
    assert.equal(calls[0].searchParams.get("permanent"), "true");
    assert.equal(calls[1].searchParams.get("country"), "ph");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.MAPBOX_ACCESS_TOKEN; else process.env.MAPBOX_ACCESS_TOKEN = originalToken;
  }
});
test("unmatched destinations fail safely rather than inventing a distance", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.MAPBOX_ACCESS_TOKEN;
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";
  globalThis.fetch = async () => Response.json({ features: [] });
  try { await assert.rejects(() => drivingDistance("Unknown", "Origin"), RouteEstimateError); }
  finally { globalThis.fetch = originalFetch; if (originalToken === undefined) delete process.env.MAPBOX_ACCESS_TOKEN; else process.env.MAPBOX_ACCESS_TOKEN = originalToken; }
});

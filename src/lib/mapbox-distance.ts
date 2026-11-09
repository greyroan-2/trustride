import "server-only";
export class RouteEstimateError extends Error {}

type Feature = { geometry?: { coordinates?: number[] }; properties?: { full_address?: string; name?: string; context?: { region?: { name?: string }; place?: { name?: string } } } };
async function geocode(query: string, token: string, permanent = false) {
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.search = new URLSearchParams({ q: query, country: "ph", limit: "1", autocomplete: "false", access_token: token }).toString();
  if (permanent) url.searchParams.set("permanent", "true");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new RouteEstimateError("Route lookup is temporarily unavailable.");
  const data = await response.json() as { features?: Feature[] };
  const feature = data.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) throw new RouteEstimateError("The location could not be found. Enter a more specific address in the Philippines.");
  return { longitude: coordinates[0], latitude: coordinates[1], label: feature?.properties?.full_address ?? feature?.properties?.name ?? query, region: feature?.properties?.context?.region?.name ?? "", place: feature?.properties?.context?.place?.name ?? "" };
}

export async function drivingDistance(destination: string, baseAddress?: string, permanent = false) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  const originAddress = baseAddress || process.env.MAPBOX_ORIGIN_ADDRESS;
  if (!token || !originAddress) throw new RouteEstimateError("Route estimates are not available yet. Please contact TrustRide for a quotation.");
  const [origin, target] = await Promise.all([geocode(originAddress, token, permanent), geocode(destination, token, permanent)]);
  const coordinates = `${origin.longitude},${origin.latitude};${target.longitude},${target.latitude}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`);
  url.search = new URLSearchParams({ access_token: token, alternatives: "false", overview: "false", steps: "false" }).toString();
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new RouteEstimateError("Route calculation is temporarily unavailable.");
  const data = await response.json() as { code?: string; routes?: { distance: number; duration: number }[] };
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route || !Number.isFinite(route.distance) || route.distance < 0 || !Number.isFinite(route.duration)) throw new RouteEstimateError("No driving route was found. Please check the destination address.");
  return { origin: origin.label, destination: target.label, destinationArea: target.place || target.region ? `${target.place}, ${target.region}` : target.label, distanceMeters: route.distance, distanceKm: Math.round(route.distance / 100) / 10, durationMinutes: Math.ceil(route.duration / 60) };
}

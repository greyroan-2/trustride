export function resolveRouteOrigin({ bookingAddress, adminAddress, environmentAddress, pickupAddress }: { bookingAddress?: string; adminAddress?: string; environmentAddress?: string; pickupAddress?: string }) {
  const candidates = [
    { address: bookingAddress, source: "booking" },
    { address: adminAddress, source: "admin" },
    { address: environmentAddress, source: "environment" },
    { address: pickupAddress, source: "pickup" },
  ];
  const match = candidates.find(candidate => typeof candidate.address === "string" && candidate.address.trim().length >= 3);
  return match ? { address: match.address!.trim(), source: match.source } : null;
}

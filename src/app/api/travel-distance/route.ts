import { readSmallJson } from "@/lib/request-security";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { supportsDriverDistancePricing } from "@/lib/distance-pricing";
import { z } from "zod";
import { activeSessionUser } from "@/lib/auth-session";
import { drivingDistance, RouteEstimateError } from "@/lib/mapbox-distance";
import { db } from "@/lib/db";
import { workflowData } from "@/lib/booking-workflow";
import { calculateDistancePrice, distancePricingConfig, rentalDurationHours } from "@/lib/distance-pricing";
import { rentalTimesSchema } from "@/lib/rental-times";
import { resolveRouteOrigin } from "@/lib/route-origin";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const user = await activeSessionUser();
    if (!user) return Response.json({ error: "Please sign in to calculate a route." }, { status: 401, headers });
    await enforceRateLimit("route-calculations", user.id, 12);
    const parsed = z.object({ bookingId: z.uuid(), destination: z.string().trim().min(3).max(300), pickupLocation: z.string().trim().max(300).optional(), pickupTime: z.string().nullable().optional(), dropoffTime: z.string().nullable().optional() }).safeParse(await readSmallJson(request));
    if (!parsed.success) return Response.json({ error: "Enter a destination address of at least 3 characters." }, { status: 400, headers });
    const booking = await db.booking.findFirst({ where: { id: parsed.data.bookingId, customerId: user.id }, include: { workflow: true, vehicle: { include: { pricing: true, model: true } } } });
    if (!booking) return Response.json({ error: "Reservation not found." }, { status: 404, headers });
    const times = rentalTimesSchema.safeParse(parsed.data);
    const data = workflowData(booking.workflow?.data);
    const config = distancePricingConfig(data.distancePricing ?? booking.vehicle.pricing?.distancePricing);
    const origin = resolveRouteOrigin({ bookingAddress: config.originAddress, adminAddress: distancePricingConfig(booking.vehicle.pricing?.distancePricing).originAddress, environmentAddress: process.env.MAPBOX_ORIGIN_ADDRESS, pickupAddress: parsed.data.pickupLocation ?? data.travel?.pickupLocation });
    if (!origin) return Response.json({ error: "Enter your pickup location first, or ask the admin to set a base pickup address.", code: "ORIGIN_REQUIRED" }, { status: 422, headers });
    const route = await drivingDistance(parsed.data.destination, origin.address);
    let quote;
    if (times.success && data.service === "WITH_DRIVER" && supportsDriverDistancePricing(booking.vehicle.model.slug) && config.enabled) {
      const hours = rentalDurationHours(booking.startDate.toISOString().slice(0, 10), booking.endDate.toISOString().slice(0, 10), times.data.pickupTime, times.data.dropoffTime);
      try {
        quote = calculateDistancePrice({ distanceMeters: route.distanceMeters, durationHours: hours, destination: route.destinationArea, config, feeMinor: booking.feeMinor, depositMinor: booking.depositMinor, useReferenceRates: booking.vehicle.model.slug.includes("innova") });
      } catch {
        quote = { status: "QUOTATION_REQUIRED", reason: "The route distance is available, but this trip needs an admin quotation." };
      }
    }
    return Response.json({ ...route, originSource: origin.source, quote, currency: booking.currency }, { headers });
  } catch (error) {
    if (error instanceof RateLimitError) return Response.json({ error: error.message }, { status: error.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": String(error.retryAfter) } });
    const message = error instanceof RouteEstimateError ? error.message : "Route calculation is temporarily unavailable. Please try again.";
    return Response.json({ error: message }, { status: 503, headers });
  }
}

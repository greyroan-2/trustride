import "server-only";
import { db } from "./db";
import { calculatePrice, reservation } from "./validation";
import { rentalTimesSchema } from "./rental-times";
import { distancePricingConfig } from "./distance-pricing";
import { bookingReferenceLock, bookingReferencePattern, bookingReferencePrefix, formatBookingReference } from "./booking-reference";
export async function createReservation(customerId: string, input: unknown) {
  const v = reservation.parse(input);
  const schedule = rentalTimesSchema.parse(input);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${v.vehicleId}::uuid FOR UPDATE`;
    const vehicle = await tx.vehicle.findUnique({
      where: { id: v.vehicleId },
      include: { pricing: true },
    });
    if (
      !vehicle ||
      vehicle.archived ||
      vehicle.status !== "ACTIVE" ||
      !vehicle.pricing
    )
      throw new Error("This vehicle cannot currently be reserved.");
    const unfinished = await tx.booking.findFirst({
      where: { customerId, vehicleId: v.vehicleId, status: { in: ["PENDING", "CONFIRMED", "DELIVERED"] } },
      select: { id: true },
    });
    if (unfinished) throw new Error("You already have an unfinished reservation for this car. Complete or cancel it before booking this car again.");
    const startDate = new Date(v.start),
      endDate = new Date(v.end);
    const conflict = await tx.booking.count({
      where: {
        vehicleId: v.vehicleId,
        status: { in: ["CONFIRMED", "DELIVERED"] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
    const blocks = await tx.availabilityBlock.count({
      where: {
        vehicleId: v.vehicleId,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
    if (conflict || blocks)
      throw new Error(
        "These dates are unavailable. Please select another period.",
      );
    const p = vehicle.pricing;
    const quote = calculatePrice(
      v.start,
      v.end,
      p.dailyMinor,
      p.feeMinor,
      p.depositMinor,
    );
    const prefix = bookingReferencePrefix();
    // One counter across all dates, vehicles, and concurrent reservations.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${bookingReferenceLock}, 0))`;
    const [counter] = await tx.$queryRaw<{ number: bigint }[]>`
      SELECT COALESCE(MAX(substring("reference" FROM '[0-9]+$')::bigint), 0) + 1 AS number
      FROM (
        SELECT "reference" FROM "Booking" WHERE "reference" ~ ${bookingReferencePattern}
        UNION ALL
        SELECT "targetId" AS "reference" FROM "AdminAuditLog"
        WHERE action = 'booking-delete' AND "targetId" ~ ${bookingReferencePattern}
      ) AS references_including_deleted
    `;
    return tx.booking.create({
      data: {
        customerId,
        vehicleId: v.vehicleId,
        reference: formatBookingReference(prefix, counter.number),
        startDate,
        endDate,
        dailyMinor: p.dailyMinor,
        feeMinor: p.feeMinor,
        depositMinor: p.depositMinor,
        currency: p.currency,
        totalMinor: quote.total,
        notes: v.notes,
        workflow: { create: { data: { schedule, distancePricing: distancePricingConfig(p.distancePricing) } } },
      },
    });
  });
}

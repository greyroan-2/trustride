import { bookingReferenceLock } from "./booking-reference";
import type { Prisma } from "@prisma/client";
import { canDeleteBookingRequest } from "./request-policy";

// Caller must authenticate an administrator and run this inside a transaction.
export async function deleteBookingRequest(tx: Prisma.TransactionClient, id: string) {
  const target = await tx.booking.findUniqueOrThrow({ where: { id }, select: { vehicleId: true } });
  await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${target.vehicleId}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id}::uuid FOR UPDATE`;
  const booking = await tx.booking.findUniqueOrThrow({ where: { id } });
  if (!canDeleteBookingRequest(booking.status)) throw new Error("Only cancelled, confirmed, or rejected requests can be deleted.");
  // Keep deleted references in the audit log and serialize with reference allocation.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${bookingReferenceLock}, 0))`;
  await tx.paymentRecord.deleteMany({ where: { bookingId: id } });
  await tx.bookingWorkflow.deleteMany({ where: { bookingId: id } });
  await tx.booking.delete({ where: { id } });
  return booking.reference;
}

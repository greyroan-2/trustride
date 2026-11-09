export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingDetails } from "@/components/booking-details";
import { workflowData } from "@/lib/booking-workflow";
import { z } from "zod";

export default async function Booking({ params, searchParams }: { params: Promise<{ bookingId: string }>; searchParams: Promise<{ view?: string }> }) {
  const { bookingId } = await params;
  const { view } = await searchParams;
  const user = await requireUser(`/bookings/${bookingId}`);
  if (!z.uuid().safeParse(bookingId).success) notFound();
  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId: user.id },
    include: { vehicle: { include: { model: true } }, workflow: true, payments: { where: { status: "PAID" } } },
  });
  if (!booking) notFound();
  if (booking.status === "REJECTED") redirect(`/bookings/${booking.id}/rejected`);
  if (["CONFIRMED","DELIVERED"].includes(booking.status) && view !== "payment") redirect(`/bookings/${booking.id}/details`);
  if (booking.status === "COMPLETED") redirect(`/bookings/${booking.id}/completed`);
  return <BookingDetails key={booking.id} initialStep={["CONFIRMED","DELIVERED"].includes(booking.status) ? 3 : undefined} initialData={workflowData(booking.workflow?.data)} booking={{
    id: booking.id, reference: booking.reference, name: booking.vehicle.model.name,
    status: booking.status, start: booking.startDate.toISOString().slice(0, 10),
    end: booking.endDate.toISOString().slice(0, 10), daily: booking.dailyMinor,
    fee: booking.feeMinor, deposit: booking.depositMinor, total: booking.totalMinor,
    currency: booking.currency, cancellationRequested: booking.cancellationRequested,
    customerName: user.name, phone: user.phone, seats: booking.vehicle.model.seats,
    paid: booking.payments.filter(payment => payment.currency === booking.currency).reduce((sum, payment) => sum + payment.amountMinor, 0),
  }} />;
}


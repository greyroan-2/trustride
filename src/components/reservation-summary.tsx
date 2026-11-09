import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CalendarDays, MapPin, UserRound, MessageSquareText } from "lucide-react";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowData } from "@/lib/booking-workflow";
import { reservationHref } from "@/lib/reservation-navigation";
import { reservationPaymentState } from "@/lib/reservation-payment";
import { formatRentalTime } from "@/lib/rental-times";
import { reservationDepositMinor } from "@/lib/reservation-deposit";
import { money } from "@/lib/validation";
import { ReservationCancellation } from "./reservation-cancellation";
import { BookingRefresh } from "./booking-refresh";
import { ReservationTestimonialForm } from "./reservation-testimonial-form";
import styles from "./reservation-summary.module.css";

export async function ReservationSummary({ bookingId, expectedStatus }: { bookingId: string; expectedStatus: "CONFIRMED" | "COMPLETED" }) {
  const user = await requireUser(reservationHref(bookingId, expectedStatus));
  if (!z.uuid().safeParse(bookingId).success) notFound();
  const booking = await db.booking.findFirst({ where: { id: bookingId, customerId: user.id }, include: { vehicle: { include: { model: true } }, workflow: true, payments: { where: { status: "PAID" } } } });
  if (!booking) notFound();
  if (booking.status !== expectedStatus && !(expectedStatus === "CONFIRMED" && booking.status === "DELIVERED")) redirect(reservationHref(booking.id, booking.status));
  const data = workflowData(booking.workflow?.data);
  const delivered = booking.status === "DELIVERED";
  const completed = booking.status === "COMPLETED";
  const { paidMinor: paid, balanceMinor: balance, fullyPaid } = reservationPaymentState(booking.totalMinor, booking.currency, booking.payments);
  const formatDate = (date: Date) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(date);
  return <section className={`wrap page ${styles.page}`}>
    <BookingRefresh />
    <Link className={styles.back} href="/bookings"><ArrowLeft size={16} aria-hidden="true" />Your reservations</Link>
    <div className={styles.heading}><div><span className={styles.status}><CheckCircle2 size={15} aria-hidden="true" />{completed ? "Completed" : delivered ? "Delivered" : "Confirmed"}</span><h1>{completed ? "Thanks for riding with us" : delivered ? "Your rental is underway" : "Your reservation is confirmed"}</h1><p>{booking.reference}</p>{!completed && <p className={styles.reservedNotice}>{delivered ? "The unit is now in your hands. Admin will mark this rental completed after the unit is returned. Any unpaid balance remains due." : fullyPaid ? "Fully paid. Your dates are reserved and shown as booked in the availability calendar." : "Your dates are reserved and blocked in the availability calendar. Pay the non-refundable 50% reservation payment below."}</p>}</div></div>
    <div className={styles.grid}>
      <article className={styles.panel}><h2><CalendarDays size={18} aria-hidden="true" />Reservation information</h2><h3>{booking.vehicle.model.name}</h3><dl><div><dt>Pickup date</dt><dd>{formatDate(booking.startDate)}</dd></div><div><dt>Return date</dt><dd>{formatDate(booking.endDate)}</dd></div><div><dt>Rental type</dt><dd>{data.service === "SELF_DRIVE" ? "Self-drive" : data.service === "WITH_DRIVER" ? "With driver" : "Not provided"}</dd></div><div><dt>Pickup time (Asia/Manila)</dt><dd>{formatRentalTime(data.schedule?.pickupTime ?? data.travel?.pickupTime)}</dd></div><div><dt>Drop-off time (Asia/Manila)</dt><dd>{formatRentalTime(data.schedule?.dropoffTime ?? data.travel?.dropoffTime)}</dd></div></dl></article>
      <article className={styles.panel}><h2><UserRound size={18} aria-hidden="true" />Contact information</h2><dl><div><dt>Contact name</dt><dd>{data.travel?.contactName || user.name || "Not provided"}</dd></div><div><dt>Phone number</dt><dd>{data.travel?.phone || user.phone || "Not provided"}</dd></div><div><dt>Passengers</dt><dd>{data.travel?.passengers ?? "Not provided"}</dd></div></dl></article>
      <article className={styles.panel}><h2><MapPin size={18} aria-hidden="true" />Trip information</h2><dl><div><dt>Pickup location</dt><dd>{data.travel?.pickupLocation || "Not provided"}</dd></div><div><dt>Destination</dt><dd>{data.travel?.destination || "Not provided"}</dd></div>{data.driverRequest && <><div><dt>Driver meetup time</dt><dd>{data.driverRequest.meetupTime} (Asia/Manila)</dd></div><div><dt>Additional requests</dt><dd>{data.driverRequest.notes || "None"}</dd></div></>}</dl></article>
      <article className={styles.panel}><h2>Payment summary · {fullyPaid ? "Fully paid" : paid > 0 ? "Partially paid" : "Unpaid"}</h2><dl>{data.routePricing?.status === "READY" && !data.routePricing.manual && <div><dt>Distance charged</dt><dd>{data.routePricing.billedKm?.toFixed(1)} km</dd></div>}<div><dt>Reservation total</dt><dd>{money(booking.totalMinor, booking.currency)}</dd></div><div><dt>Approved payments</dt><dd>{money(paid, booking.currency)}</dd></div><div><dt>50% non-refundable reservation payment</dt><dd>{money(reservationDepositMinor(booking.totalMinor), booking.currency)}</dd></div><div><dt>Remaining balance</dt><dd>{money(balance, booking.currency)}</dd></div></dl>{paid > 0 && balance > 0 && <p>Arrange the remaining balance directly with TrustRide.</p>}{!completed && balance > 0 && paid === 0 && <Link className={styles.primary} href={`/bookings/${booking.id}?view=payment`}>Pay 50% reservation payment →</Link>}</article>
    </div>
    {!completed && !delivered && <ReservationCancellation bookingId={booking.id} requested={booking.cancellationRequested} />}
    {completed && <section className={`${styles.panel} ${styles.testimonial}`}><h2><MessageSquareText size={18} aria-hidden="true" />Share your experience</h2><ReservationTestimonialForm bookingId={booking.id} submitted={Boolean(data.testimonialId)} /></section>}
  </section>;
}



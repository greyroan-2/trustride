export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MessageSquareText, X } from "lucide-react";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowData } from "@/lib/booking-workflow";
import { rejectionReason } from "@/lib/reservation-rejection";
import styles from "./rejected.module.css";

export default async function RejectedReservation({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const user = await requireUser(`/bookings/${bookingId}/rejected`);
  if (!z.uuid().safeParse(bookingId).success) notFound();
  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId: user.id },
    select: { id: true, reference: true, status: true, workflow: { select: { data: true } } },
  });
  if (!booking) notFound();
  if (booking.status !== "REJECTED") redirect(`/bookings/${booking.id}`);
  const reason = rejectionReason(workflowData(booking.workflow?.data));
  return <section className={`wrap page ${styles.page}`}>
    <Link className={styles.back} href="/bookings"><ArrowLeft size={16} aria-hidden="true" />Your reservations</Link>
    <article className={styles.card}>
      <span className={styles.icon}><X size={26} aria-hidden="true" /></span>
      <p className={styles.status}>REQUEST REJECTED</p>
      <h1>Your reservation was rejected</h1>
      <p className={styles.reference}>{booking.reference}</p>
      <div className={styles.reason}><h2><MessageSquareText size={18} aria-hidden="true" />Reason from the admin</h2><p>{reason ?? "No reason was recorded for this request. Please contact TrustRide for more information."}</p></div>
      <Link className={styles.contact} href="/contact">Contact TrustRide</Link>
    </article>
  </section>;
}

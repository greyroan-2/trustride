"use client";
import { useFormStatus } from "react-dom";
import { Clock3, XCircle } from "lucide-react";
import { requestCancellation } from "@/app/actions/booking";

function CancellationButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="booking-cancellation-button" disabled={pending}><XCircle size={16} aria-hidden="true" />{pending ? "Sending request…" : "Request cancellation"}</button>;
}

export function ReservationCancellation({ bookingId, requested }: { bookingId: string; requested: boolean }) {
  if (requested) return <div className="booking-cancellation booking-cancellation-pending" role="status"><span className="booking-cancellation-icon"><Clock3 size={20} aria-hidden="true" /></span><div><strong>Cancellation request sent</strong><p>Your request is awaiting admin review. Your reservation stays active until it is approved.</p></div></div>;
  return <section className="booking-cancellation"><div><h3>Need to cancel your reservation?</h3><p>Send a cancellation request for the admin to review.</p></div><form action={requestCancellation}><input type="hidden" name="id" value={bookingId} /><CancellationButton /></form></section>;
}

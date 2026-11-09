"use client";
import { useActionState, useState } from "react";
import { submitReservationTestimonial } from "@/app/actions/reservation-testimonial";
import { Star } from "lucide-react";
import { testimonialRatingLabels } from "@/lib/testimonial-rating";
export function ReservationTestimonialForm({ bookingId, submitted = false, bookings }: { bookingId?: string; submitted?: boolean; bookings?: { id: string; label: string }[] }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [state, action, pending] = useActionState(submitReservationTestimonial, {});
  if (submitted || state.success) return <div className="reservation-testimonial-success" role="status"><strong>Thank you for sharing your experience.</strong><p>Your testimonial has been submitted for admin review.</p></div>;
  return <form action={action} className="reservation-testimonial-form">
    {bookings ? <label>Completed rental<select name="bookingId" required defaultValue="" disabled={pending}><option value="" disabled>Choose the rental you want to review</option>{bookings.map(booking => <option key={booking.id} value={booking.id}>{booking.label}</option>)}</select></label> : <input type="hidden" name="bookingId" value={bookingId} />}
    <fieldset className="testimonial-rating-picker" disabled={pending}><legend>How was your experience?</legend><div className="testimonial-rating-options" onMouseLeave={() => setHovered(0)}>{testimonialRatingLabels.map((label, index) => <label key={label} onMouseEnter={() => setHovered(index + 1)}><input type="radio" name="rating" value={index + 1} checked={rating === index + 1} onChange={() => setRating(index + 1)} required aria-label={`${index + 1} ${index === 0 ? "star" : "stars"}: ${label}`} /><Star size={30} className={index < (hovered || rating) ? "filled" : ""} aria-hidden="true" /></label>)}</div><p aria-live="polite">{rating ? `${rating} out of 5 - ${testimonialRatingLabels[rating - 1]}` : "Select a rating"}</p><small>1 Poor - 2 Fair - 3 Good - 4 Very good - 5 Excellent</small></fieldset>
    <label>Your experience<textarea name="content" required minLength={10} maxLength={1500} rows={5} placeholder="Tell us about your rental experience with TrustRide." disabled={pending} /></label>
    <p>Your testimonial will appear publicly once approved by an admin.</p>
    {state.error && <p role="alert" className="reservation-testimonial-error">{state.error}</p>}
    <button type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit testimonial"}</button>
  </form>;
}

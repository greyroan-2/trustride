import { Star } from "lucide-react";
import { testimonialRatingLabels } from "@/lib/testimonial-rating";
export function TestimonialRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="testimonial-unrated">Not rated</span>;
  return <span className="testimonial-rating-display" aria-label={`${rating} out of 5 stars: ${testimonialRatingLabels[rating - 1]}`}><span aria-hidden="true">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={14} className={star <= rating ? "filled" : ""} />)}</span><small>{rating}/5 &mdash; {testimonialRatingLabels[rating - 1]}</small></span>;
}

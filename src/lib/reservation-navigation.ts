import { z } from "zod";
export const testimonialContentSchema = z.string().trim().min(10, "Please write at least 10 characters about your experience.").max(1500, "Keep your testimonial to 1,500 characters or fewer.");
export const canLeaveTestimonial = (status: string, testimonialId?: string) => status === "COMPLETED" && !testimonialId;
export function reservationHref(id: string, status: string) {
  const base = `/bookings/${id}`;
  return status === "REJECTED" ? `${base}/rejected` : ["CONFIRMED","DELIVERED"].includes(status) ? `${base}/details` : status === "COMPLETED" ? `${base}/completed` : base;
}

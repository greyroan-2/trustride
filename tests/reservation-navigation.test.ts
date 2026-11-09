import { test } from "node:test";
import assert from "node:assert/strict";
import { canLeaveTestimonial, reservationHref, testimonialContentSchema } from "../src/lib/reservation-navigation";

test("each reservation status opens the appropriate customer page", () => {
  assert.equal(reservationHref("123", "PENDING"), "/bookings/123");
  assert.equal(reservationHref("123", "DELIVERED"), "/bookings/123/details");
  assert.equal(reservationHref("123", "CONFIRMED"), "/bookings/123/details");
  assert.equal(reservationHref("123", "REJECTED"), "/bookings/123/rejected");
  assert.equal(reservationHref("123", "COMPLETED"), "/bookings/123/completed");
});
test("testimonials require a completed rental with no previous submission", () => {
  for (const status of ["PENDING", "CONFIRMED", "DELIVERED", "REJECTED", "CANCELLED"]) assert.equal(canLeaveTestimonial(status), false);
  assert.equal(canLeaveTestimonial("COMPLETED"), true);
  assert.equal(canLeaveTestimonial("COMPLETED", "existing-testimonial"), false);
  for (const content of ["", "   ", "short", "x".repeat(1501)]) assert.equal(testimonialContentSchema.safeParse(content).success, false);
  assert.equal(testimonialContentSchema.parse("  A great rental experience.  "), "A great rental experience.");
});

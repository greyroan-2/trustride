"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowData } from "@/lib/booking-workflow";
import { canLeaveTestimonial, testimonialContentSchema } from "@/lib/reservation-navigation";
import { testimonialRatingSchema } from "@/lib/testimonial-rating";
import { emojiFormError } from "@/lib/text-input";

export async function submitReservationTestimonial(_previous: { error?: string; success?: boolean }, form: FormData): Promise<{ error?: string; success?: boolean }> {
  const user = await requireClient("/bookings");
  const emojiError = emojiFormError(form);
  if (emojiError) return { error: emojiError };
  const parsed = z.object({ bookingId: z.uuid(), content: testimonialContentSchema, rating: testimonialRatingSchema }).safeParse({ bookingId: form.get("bookingId"), content: form.get("content"), rating: form.get("rating") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your testimonial." };
  try {
    await db.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ id: string; status: string }[]>`SELECT id, status FROM "Booking" WHERE id = ${parsed.data.bookingId}::uuid AND "customerId" = ${user.id}::uuid FOR UPDATE`;
      if (!rows.length || rows[0].status !== "COMPLETED") throw new Error("NOT_COMPLETED");
      const workflow = await tx.bookingWorkflow.findUnique({ where: { bookingId: rows[0].id } });
      const data = workflowData(workflow?.data);
      if (!canLeaveTestimonial(rows[0].status, data.testimonialId)) throw new Error("ALREADY_SUBMITTED");
      const testimonial = await tx.testimonial.create({ data: { customerId: user.id, author: user.name || "TrustRide customer", content: parsed.data.content, rating: parsed.data.rating, published: false, sample: false } });
      const updated = JSON.parse(JSON.stringify({ ...data, testimonialId: testimonial.id }));
      await tx.bookingWorkflow.upsert({ where: { bookingId: rows[0].id }, create: { bookingId: rows[0].id, data: updated }, update: { data: updated } });
    });
  } catch (error) {
    return { error: error instanceof Error && error.message === "ALREADY_SUBMITTED" ? "You have already submitted a testimonial for this rental." : error instanceof Error && error.message === "NOT_COMPLETED" ? "Testimonials are available only after your rental is completed." : "Your testimonial could not be saved. Please try again." };
  }
  revalidatePath(`/bookings/${parsed.data.bookingId}/completed`);
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonials");
  return { success: true };
}

"use server";
import { emojiFormError } from "@/lib/text-input";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { createReservation } from "@/lib/bookings";
import { db } from "@/lib/db";
import { z } from "zod";
export async function reserve(form: FormData) {
  const user = await requireClient("/fleet");
  const emojiError = emojiFormError(form);
  if (emojiError) redirect(`/fleet?message=${encodeURIComponent(emojiError)}`);
  const input = {
    vehicleId: form.get("vehicleId"),
    start: form.get("start"),
    end: form.get("end"),
    pickupTime: form.get("pickupTime"),
    dropoffTime: form.get("dropoffTime"),
    notes: form.get("notes") ?? "",
  };
  let id = "";
  try {
    const booking = await createReservation(user.id, input);
    id = booking.id;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("You already have")) redirect(`/fleet/${encodeURIComponent(String(input.vehicleId))}?message=${encodeURIComponent(error.message)}`);
    redirect(
      `/fleet/${encodeURIComponent(String(input.vehicleId))}?message=Reservation+could+not+be+submitted.+Check+your+dates+and+availability.`,
    );
  }
  revalidatePath("/dashboard");
  redirect(`/bookings/${id}`);
}
export async function requestCancellation(form: FormData) {
  const user = await requireClient("/bookings");
  const id = z.uuid().parse(form.get("id"));
  await db.booking.updateMany({
    where: {
      id,
      customerId: user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    data: { cancellationRequested: true },
  });
  revalidatePath(`/bookings/${id}`);
  redirect(`/bookings/${id}`);
}

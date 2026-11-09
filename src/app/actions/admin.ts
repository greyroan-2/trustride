"use server";
import { canTransitionBooking, bookingPickupAt } from "@/lib/booking-status";
import { syncDueDeliveries } from "@/lib/delivery-sync";
import { testimonialRatingSchema } from "@/lib/testimonial-rating";
import { supportsDriverDistancePricing } from "@/lib/distance-pricing";
﻿
import { DATE_TRANSACTIONS_MESSAGE } from "@/lib/calendar-transactions";
import { reservationDepositError } from "@/lib/reservation-deposit";
import { distancePricingSchema } from "@/lib/distance-pricing";
import { rejectionReasonSchema } from "@/lib/reservation-rejection";
import { emojiFormError } from "@/lib/text-input";
import { deleteBookingRequest } from "@/lib/delete-booking-request";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { catalogueTags } from "@/lib/catalogue-cache";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { date, pesoAmount } from "@/lib/validation";
import { remainingBlockedPeriods } from "@/lib/availability-block";
import { workflowData, hasRequiredDriverId, hasSelfDriveLicenseMatch } from "@/lib/booking-workflow";
const url = z
  .url()
  .refine((v) => v.startsWith("https://"), "Use an HTTPS asset URL");
export async function adminMutation(form: FormData) {
  const actor = await requireAdmin();
  const action = String(form.get("action"));
  const emojiError = emojiFormError(form);
  if (emojiError) {
    const section = ["booking", "booking-quote", "balance-payment", "payment-review", "booking-delete"].includes(action) ? "requests" : action === "pricing" ? "pricing" : ["testimonial", "publish"].includes(action) ? "testimonials" : "vehicles";
    redirect(`/admin/${section}?message=${encodeURIComponent(emojiError)}`);
  }
  let message = "Saved.";
  try {
    await db.$transaction(async (tx) => {
      let targetId = String(form.get("id") ?? "");
      if (action === "booking-delete") {
        if (form.get("confirmDelete") !== "yes") throw new Error("Confirm deletion first.");
        targetId = await deleteBookingRequest(tx, z.uuid().parse(targetId));
      } else if (action === "payment-review") {
        const id = z.uuid().parse(targetId);
        const target = await tx.booking.findUniqueOrThrow({ where: { id }, select: { vehicleId: true } });
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${target.vehicleId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id}::uuid FOR UPDATE`;
        const booking = await tx.booking.findUniqueOrThrow({ where: { id }, include: { workflow: true } });
        if (!["PENDING", "CONFIRMED", "DELIVERED"].includes(booking.status)) throw new Error("This reservation is closed.");
        const details = workflowData(booking.workflow?.data);
        const proof = details.paymentProof;
        if (!proof || proof.status !== "PENDING" || proof.document.uploadedAt !== form.get("submission")) throw new Error("This payment has already been reviewed or replaced.");
        const decision = z.enum(["APPROVED", "REJECTED"]).parse(form.get("decision"));
        const reviewNote = (decision === "REJECTED" ? rejectionReasonSchema : z.string().trim().max(500)).parse(form.get("reviewNote") ?? "");
        if (decision === "APPROVED") {
          if (!["CONFIRMED","DELIVERED"].includes(booking.status)) throw new Error("Confirm the reservation before approving its payment.");
          const paid = await tx.paymentRecord.aggregate({ where: { bookingId: id, status: "PAID", currency: booking.currency }, _sum: { amountMinor: true } });
          const depositError = reservationDepositError(booking.totalMinor, paid._sum.amountMinor ?? 0, proof.amountMinor);
          if (depositError) throw new Error(depositError);
          await tx.paymentRecord.create({ data: { bookingId: id, amountMinor: proof.amountMinor, currency: booking.currency, status: "PAID" } });
        }
        if (decision === "REJECTED" && booking.status !== "DELIVERED") await tx.booking.update({ where: { id }, data: { status: "REJECTED", cancellationRequested: false } });
        const reviewedAt = new Date().toISOString();
        const data = { ...details, ...(decision === "REJECTED" && booking.status !== "DELIVERED" ? { rejection: { reason: reviewNote, rejectedAt: reviewedAt } } : {}), paymentProof: { ...proof, status: decision, reviewedAt, reviewNote } };
        await tx.bookingWorkflow.update({ where: { bookingId: id }, data: { data: JSON.parse(JSON.stringify(data)) } });
      } else if (action === "balance-payment") {
        const id = z.uuid().parse(targetId);
        if (form.get("confirmReceived") !== "yes") throw new Error("Confirm that the remaining payment has been received.");
        const target = await tx.booking.findUniqueOrThrow({ where: { id }, select: { vehicleId: true } });
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${target.vehicleId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id}::uuid FOR UPDATE`;
        const booking = await tx.booking.findUniqueOrThrow({ where: { id } });
        const payments = await tx.paymentRecord.aggregate({ where: { bookingId: id, currency: booking.currency, status: "PAID" }, _sum: { amountMinor: true } });
        const paid = payments._sum.amountMinor ?? 0;
        if (!["CONFIRMED","DELIVERED","COMPLETED"].includes(booking.status) || paid >= booking.totalMinor) throw new Error("An unpaid balance on a confirmed, delivered, or completed reservation is required.");
        await tx.paymentRecord.create({ data: { bookingId: id, amountMinor: booking.totalMinor - paid, currency: booking.currency, status: "PAID" } });
      } else if (action === "booking-quote") {
        const id = z.uuid().parse(targetId);
        const target = await tx.booking.findUniqueOrThrow({ where: { id }, select: { vehicleId: true } });
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${target.vehicleId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id}::uuid FOR UPDATE`;
        const booking = await tx.booking.findUniqueOrThrow({ where: { id }, include: { workflow: true, vehicle: { include: { model: true } } } });
        const details = workflowData(booking.workflow?.data);
        if (booking.status !== "PENDING" || details.service !== "WITH_DRIVER" || !supportsDriverDistancePricing(booking.vehicle.model.slug)) throw new Error("A pending with-driver reservation is required.");
        if (details.paymentProof?.status === "PENDING" || await tx.paymentRecord.count({ where: { bookingId: id, status: "PAID" } })) throw new Error("A payment is already under review or recorded.");
        const baseMinor = pesoAmount.parse(form.get("rentalAmount"));
        const feeMinor = pesoAmount.parse(form.get("additionalFee") ?? "0");
        const totalMinor = baseMinor + feeMinor + booking.depositMinor;
        if (totalMinor <= 0) throw new Error("The quotation total must be greater than zero.");
        const data = JSON.parse(JSON.stringify({ ...details, routePricing: { status: "READY", manual: true, baseMinor, distanceMinor: 0, totalMinor } }));
        await tx.booking.update({ where: { id }, data: { feeMinor, totalMinor } });
        await tx.bookingWorkflow.upsert({ where: { bookingId: id }, create: { bookingId: id, data }, update: { data } });
      } else if (action === "booking") {
        const id = z.uuid().parse(targetId);
        const target = await tx.booking.findUniqueOrThrow({ where: { id }, select: { vehicleId: true } });
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${target.vehicleId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id}::uuid FOR UPDATE`;
        const b = await tx.booking.findUniqueOrThrow({ where: { id } });
        const status = z
          .enum(["CONFIRMED", "DELIVERED", "REJECTED", "CANCELLED", "COMPLETED"])
          .parse(form.get("status"));
        if (!canTransitionBooking(b.status,status)) throw new Error("Invalid status transition.");
        if (status === "DELIVERED") {
          const data=workflowData((await tx.bookingWorkflow.findUnique({where:{bookingId:id}}))?.data);
          if (bookingPickupAt(b.startDate.toISOString().slice(0,10),data.schedule?.pickupTime ?? data.travel?.pickupTime)>new Date()) throw new Error("Delivery is available only once pickup has started.");
        }
        if (status === "COMPLETED" && form.get("completionApproved") !== "yes") throw new Error("Confirm that the unit has been returned before completing this rental.");
        if (status === "CONFIRMED") {
          const workflow = await tx.bookingWorkflow.findUnique({ where: { bookingId: id } });
          if (workflowData(workflow?.data).routePricing?.status === "QUOTATION_REQUIRED") throw new Error("Set the rental quotation before confirming this request.");
          if (!hasSelfDriveLicenseMatch(workflowData(workflow?.data))) throw new Error("The self-drive license and LTMS documents must pass matching and active-status checks.");
          if (!hasRequiredDriverId(workflowData(workflow?.data))) throw new Error("A valid ID is required for with-driver bookings.");
          const vehicle = await tx.vehicle.findUniqueOrThrow({
            where: { id: b.vehicleId },
            include: { model: true },
          });
          if (supportsDriverDistancePricing(vehicle.model.slug) && workflowData(workflow?.data).service === "WITH_DRIVER" && workflowData(workflow?.data).routePricing?.status !== "READY") throw new Error("Set the rental quotation before confirming this request.");
          if (vehicle.archived || vehicle.status !== "ACTIVE")
            throw new Error("Vehicle is unavailable.");
          const blocked = await tx.availabilityBlock.count({
            where: {
              vehicleId: b.vehicleId,
              startDate: { lt: b.endDate },
              endDate: { gt: b.startDate },
            },
          });
          if (blocked)
            throw new Error("Dates conflict with a maintenance block.");
        }
        if (status === "REJECTED") {
          const reason = rejectionReasonSchema.parse(form.get("rejectionReason") ?? "");
          const workflow = await tx.bookingWorkflow.findUnique({ where: { bookingId: id } });
          const data = JSON.parse(JSON.stringify({ ...workflowData(workflow?.data), rejection: { reason, rejectedAt: new Date().toISOString() } }));
          await tx.bookingWorkflow.upsert({ where: { bookingId: id }, create: { bookingId: id, data }, update: { data } });
        }
        await tx.booking.update({
          where: { id },
          data: { status, cancellationRequested: false },
        });
      } else if (action === "pricing") {
        const vehicleId = z.uuid().parse(targetId);
        const data = {
          dailyMinor: pesoAmount.parse(form.get("dailyRate")),
          feeMinor: pesoAmount.parse(form.get("additionalFee") ?? "0"),
          depositMinor: pesoAmount.parse(form.get("deposit")),
          distancePricing: distancePricingSchema.parse({ enabled: form.get("distancePricingEnabled") === "on", perKmMinor: pesoAmount.parse(form.get("perKmRate") ?? "0"), originAddress: String(form.get("originAddress") ?? ""), mode: form.get("distancePricingMode") ?? "DISTANCE_ONLY", roundTrip: form.get("roundTrip") === "yes" }),
          currency: z.enum(["PHP"]).parse(form.get("currency")),
        };
        await tx.pricingRule.upsert({
          where: { vehicleId },
          create: { vehicleId, ...data },
          update: data,
        });
      } else if (action === "vehicle") {
        const modelId = z.uuid().parse(form.get("modelId"));
        const unitCode = z.string().min(1).max(50).parse(form.get("unitCode"));
        const status = z
          .enum(["ACTIVE", "UNAVAILABLE", "MAINTENANCE"])
          .parse(form.get("status"));
        const data = { modelId, unitCode, status };
        const v = targetId
          ? await tx.vehicle.update({
              where: { id: z.uuid().parse(targetId) },
              data,
            })
          : await tx.vehicle.create({ data });
        targetId = v.id;
        if (form.has("vehicleName")) {
          const name = z.string().trim().min(1).max(100).parse(form.get("vehicleName"));
          await tx.vehicleModel.update({ where: { id: v.modelId }, data: { name } });
        }
      } else if (action === "model") {
        const id = z.uuid().parse(targetId);
        await tx.vehicleModel.update({
          where: { id },
          data: {
            name: z.string().min(1).max(100).parse(form.get("name")),
            category: z.string().min(1).max(50).parse(form.get("category")),
            year: form.get("year")
              ? z.coerce
                  .number()
                  .int()
                  .min(2000)
                  .max(2100)
                  .parse(form.get("year"))
              : null,
            seats: form.get("seats")
              ? z.coerce.number().int().min(1).max(50).parse(form.get("seats"))
              : null,
            transmission:
              z.string().max(50).parse(form.get("transmission")) || null,
            luggage: z.string().max(200).parse(form.get("luggage")) || null,
            description: z.string().max(2000).parse(form.get("description")),
            features: String(form.get("features"))
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 30),
          },
        });
      } else if (action === "archive") {
        await tx.vehicle.update({
          where: { id: z.uuid().parse(targetId) },
          data: { archived: true },
        });
      } else if (action === "block") {
        const vehicleId = z.uuid().parse(form.get("vehicleId"));
        // A request on any vehicle prevents disabling these dates. Lock all vehicle rows
        // in a stable order so concurrent request creation cannot race this check.
        await tx.$queryRaw`SELECT id FROM "Vehicle" ORDER BY id FOR UPDATE`;
        const start = date.parse(form.get("start")),
          end = date.parse(form.get("end"));
        if (end <= start) throw new Error("Return must follow pickup.");
        const transactions = await tx.booking.count({ where: { status: { in: ["PENDING", "CONFIRMED", "DELIVERED"] }, startDate: { lt: new Date(end) }, endDate: { gt: new Date(start) } } });
        if (transactions) throw new Error(DATE_TRANSACTIONS_MESSAGE);
        const b = await tx.availabilityBlock.create({
          data: {
            vehicleId,
            startDate: new Date(start),
            endDate: new Date(end),
            reason: z.string().min(1).max(200).parse(form.get("reason")),
          },
        });
        targetId = b.id;
      } else if (action === "unblock-day") {
        const vehicleId = z.uuid().parse(form.get("vehicleId"));
        const start = new Date(`${date.parse(form.get("start"))}T00:00:00Z`);
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${vehicleId}::uuid FOR UPDATE`;
        const blocks = await tx.availabilityBlock.findMany({
          where: { vehicleId, startDate: { lte: start }, endDate: { gt: start } },
        });
        if (!blocks.length) throw new Error("No block exists on this date.");
        for (const block of blocks) {
          await tx.availabilityBlock.delete({ where: { id: block.id } });
          for (const remaining of remainingBlockedPeriods(block.startDate, block.endDate, start)) {
            await tx.availabilityBlock.create({ data: { vehicleId, ...remaining, reason: block.reason } });
          }
        }
        targetId = vehicleId;
      } else if (action === "unblock") {
        await tx.availabilityBlock.delete({
          where: { id: z.uuid().parse(targetId) },
        });
      } else if (action === "media") {
        const vehicleId = z.uuid().parse(targetId);
        const m = await tx.vehicleMedia.create({
          data: {
            vehicleId,
            url: url.parse(form.get("url")),
            type: z
              .enum(["IMAGE", "MODEL", "PANORAMA"])
              .parse(form.get("type")),
            alt: z.string().min(1).max(200).parse(form.get("alt")),
          },
        });
        targetId = m.id;
      } else if (action === "testimonial") {
        const t = await tx.testimonial.create({
          data: {
            rating: form.get("rating") ? testimonialRatingSchema.parse(form.get("rating")) : null,
            author: z.string().min(1).max(100).parse(form.get("author")),
            content: z.string().min(1).max(1500).parse(form.get("content")),
            sample: form.get("sample") === "on",
            published: form.get("published") === "on",
          },
        });
        targetId = t.id;
      } else if (action === "publish") {
        await tx.testimonial.update({
          where: { id: z.uuid().parse(targetId) },
          data: { published: form.get("published") === "true" },
        });
      } else throw new Error("Unknown action.");
      await tx.adminAuditLog.create({
        data: { actorId: actor.id, action, targetId },
      });
    });
  } catch (error) {
    const visibleErrors = [DATE_TRANSACTIONS_MESSAGE, "Set the rental quotation before confirming this request.", "Invalid status transition.", "Delivery is available only once pickup has started.", "Confirm that the unit has been returned before completing this rental.", "The quotation total must be greater than zero.", "A pending with-driver reservation is required.", "A payment is already under review or recorded.", "Confirm that the remaining payment has been received.", "An unpaid balance on a confirmed, delivered, or completed reservation is required.", "A payment is already recorded. Please contact TrustRide to arrange the remaining balance.", "The receipt must show exactly the 50% reservation payment. This payment is non-refundable."];
    message = error instanceof Error && visibleErrors.includes(error.message) ? error.message : error instanceof z.ZodError ? error.issues[0]?.message ?? "Check your inputs." :
      "Could not save. Check your inputs, booking status, and calendar conflicts.";
  }
  await syncDueDeliveries(true);
  if (["testimonial", "publish"].includes(action)) updateTag(catalogueTags.testimonials);
  else updateTag(catalogueTags.fleet);
  revalidatePath("/admin", "layout");
  revalidatePath("/fleet", "layout");
  revalidatePath("/bookings", "layout");
  revalidatePath("/testimonials");
  revalidatePath("/dashboard");
  if (action === "pricing") {
    const vehicle = String(form.get("id") ?? "");
    redirect(`/admin/pricing?vehicle=${encodeURIComponent(vehicle)}&message=${encodeURIComponent(message)}&noticeId=${crypto.randomUUID()}`);
  }
  if (["block", "unblock", "unblock-day"].includes(action)) {
    const month = String(form.get("month") ?? "");
    redirect(`/admin/bookings?message=${encodeURIComponent(message)}&noticeId=${crypto.randomUUID()}${/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month) ? `&month=${month}` : ""}`);
  }
  redirect(
    `/admin/${["booking", "booking-quote", "balance-payment", "payment-review", "booking-delete"].includes(action) ? "requests" : ["pricing"].includes(action) ? "pricing" : ["testimonial", "publish"].includes(action) ? "testimonials" : "vehicles"}?message=${encodeURIComponent(message)}&noticeId=${crypto.randomUUID()}${["booking", "booking-quote", "balance-payment", "payment-review"].includes(action) && z.uuid().safeParse(form.get("id")).success ? `&request=${encodeURIComponent(String(form.get("id")))}` : ""}`,
  );
}



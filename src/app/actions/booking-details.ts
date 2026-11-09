"use server";
import { supportsDriverDistancePricing } from "@/lib/distance-pricing";

import { enforceRateLimit } from "@/lib/rate-limit";
import { sanitizeImageUpload, ImageUploadError } from "@/lib/image-upload";
import { emojiFormError } from "@/lib/text-input";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClient } from "@/lib/auth";
import { reservation, calculatePrice } from "@/lib/validation";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { saveSupportingDocumentDraft } from "@/lib/supporting-document-draft";
import { saveLicenseOcrDraft } from "@/lib/license-draft";
import { LicenseReadError } from "@/lib/license-parser";
import { ReceiptReadError } from "@/lib/receipt-parser";
import { reservationDepositError } from "@/lib/reservation-deposit";
import { calculateDistancePrice, distancePricingConfig, rentalDurationHours } from "@/lib/distance-pricing";
import { drivingDistance } from "@/lib/mapbox-distance";
import { rentalTimesSchema } from "@/lib/rental-times";
import { driverDocuments, driverIdTypeSchema, hasRequiredDriverId, hasSelfDriveLicenseMatch, governmentIdTypeSchema, selfDriveDocuments, travelDetailsSchema, workflowData, type BookingDocument, type WorkflowData } from "@/lib/booking-workflow";

export type BookingStepResult = { error?: string; data?: WorkflowData; nextStep?: number };
export async function scanPaymentReceipt(form: FormData): Promise<{ amount?: string; reference?: string; error?: string }> {
  const user = await requireClient("/bookings");
  try {
    await enforceRateLimit("document-scans", user.id, 8);
    const id = z.uuid().parse(form.get("bookingId"));
    const booking = await db.booking.findFirst({ where: { id, customerId: user.id, status: { in: ["PENDING", "CONFIRMED", "DELIVERED"] } }, select: { id: true, totalMinor: true, currency: true } });
    if (!booking) return { error: "Booking not found or unavailable." };
    const file = form.get("receipt");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return { error: "Upload a JPEG or PNG receipt of 5 MB or smaller." };
    const { extractReceipt } = await import("@/lib/receipt-ocr");
    const { bytes } = await sanitizeImageUpload(file);
    const details = await extractReceipt(bytes);
    const paid = await db.paymentRecord.aggregate({ where: { bookingId: id, currency: booking.currency, status: "PAID" }, _sum: { amountMinor: true } });
    const depositError = reservationDepositError(booking.totalMinor, paid._sum.amountMinor ?? 0, details.amountMinor);
    if (depositError) return { error: depositError };
    return { amount: (details.amountMinor / 100).toFixed(2), reference: details.reference };
  } catch (error) {
    return { error: (error instanceof ImageUploadError || error instanceof ReceiptReadError) ? error.message : "Could not read this receipt. Please try again with a clear JPEG or PNG image." };
  }
}
export async function saveBookingDetails(form: FormData): Promise<BookingStepResult> {
  const user = await requireClient("/bookings");
  const emojiError = emojiFormError(form);
  if (emojiError) return { error: emojiError };
  const uploaded: string[] = [];
  let cleanup: (() => Promise<unknown>) | undefined;
  try {
    const id = z.uuid().parse(form.get("bookingId"));
    const booking = await db.booking.findFirst({ where: { id, customerId: user.id }, include: { workflow: true, vehicle: { include: { model: true, pricing: true } } } });
    if (!booking) return { error: "Booking not found." };
    const existing = workflowData(booking.workflow?.data);
    const step = z.enum(["selection", "travel", "requirements", "payment"]).parse(form.get("step"));
    if (step === "requirements" || step === "payment") await enforceRateLimit("document-scans", user.id, 8);
    if (step === "payment" ? !["PENDING", "CONFIRMED", "DELIVERED"].includes(booking.status) : booking.status !== "PENDING") return { error: step === "payment" ? "Payment proof cannot be submitted for this reservation status." : "This reservation has already been reviewed. Contact TrustRide to request changes." };
    let selectedDates: { start: string; end: string } | undefined;
    let patch: WorkflowData = {};
    let nextStep = 1;
    if (step === "payment") {
      if (existing.service === "WITH_DRIVER" && supportsDriverDistancePricing(booking.vehicle.model.slug) && existing.routePricing?.status !== "READY") return { error: "An admin quotation or calculated route price is required before making the reservation payment." };
      if (form.get("nonRefundableAccepted") !== "yes") return { error: "Acknowledge that the 50% reservation payment is non-refundable before submitting." };
      if (!existing.privacyConsent || existing.privacyConsent.service !== existing.service || !existing.requirementsSubmittedAt || !hasRequiredDriverId(existing) || !hasSelfDriveLicenseMatch(existing)) return { error: "Complete your booking requirements before submitting payment proof." };
      if (existing.paymentProof?.status === "PENDING") return { error: "Your previous payment proof is still awaiting review." };
      const method = z.enum(["GCASH", "BANK_TRANSFER"]).parse(form.get("paymentMethod"));
      const file = form.get("paymentProof");
      if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return { error: "Upload a JPEG or PNG receipt of 5 MB or smaller." };
      const { bytes } = await sanitizeImageUpload(file);
      const { extractReceipt } = await import("@/lib/receipt-ocr");
      const { amountMinor, reference } = await extractReceipt(bytes);
      const paid = await db.paymentRecord.aggregate({ where: { bookingId: id, currency: booking.currency, status: "PAID" }, _sum: { amountMinor: true } });
      const depositError = reservationDepositError(booking.totalMinor, paid._sum.amountMinor ?? 0, amountMinor);
      if (depositError) return { error: depositError };
      const jpg = bytes[0] === 255 && bytes[1] === 216;
      const client = await supabase();
      const path = `${user.id}/${id}/${randomUUID()}.${jpg ? "jpg" : "png"}`;
      cleanup = () => client.storage.from("booking-requirements").remove(uploaded);
      const { error } = await client.storage.from("booking-requirements").upload(path, bytes, { contentType: jpg ? "image/jpeg" : "image/png", upsert: false });
      if (error) throw new Error("Documents could not be uploaded. Please try again.");
      uploaded.push(path);
      patch = { paymentProof: { document: { path, name: file.name.slice(0, 200), uploadedAt: new Date().toISOString() }, amountMinor, reference, method, status: "PENDING" } };
      nextStep = 3;
    } else if (step === "selection") {
      const dates = reservation.parse({ vehicleId: booking.vehicleId, start: form.get("start"), end: form.get("end"), notes: booking.notes ?? "" });
      selectedDates = { start: dates.start, end: dates.end };
      const service = z.enum(["SELF_DRIVE", "WITH_DRIVER"]).parse(form.get("service"));
      const schedule = rentalTimesSchema.parse(Object.fromEntries(form));
      patch = { service, schedule, ...(existing.travel ? { travel: { ...existing.travel, ...schedule } } : {}), routePricing: service === "WITH_DRIVER" && supportsDriverDistancePricing(booking.vehicle.model.slug) ? { status: "QUOTATION_REQUIRED", reason: "Save your destination and travel times to calculate the price." } : undefined, ...(service !== existing.service ? { requirementsSubmittedAt: "", privacyConsent: undefined } : {}) };
    } else if (step === "travel") {
      if (!existing.service) return { error: "Choose your rental type first." };
      const travel = travelDetailsSchema.parse(Object.fromEntries(form));
      if (booking.vehicle.model.seats && travel.passengers > booking.vehicle.model.seats) return { error: `This vehicle seats up to ${booking.vehicle.model.seats} passengers.` };
      patch = { travel, schedule: { pickupTime: travel.pickupTime, dropoffTime: travel.dropoffTime } };
      if (existing.service === "WITH_DRIVER" && supportsDriverDistancePricing(booking.vehicle.model.slug)) {
        const config = distancePricingConfig(existing.distancePricing ?? booking.vehicle.pricing?.distancePricing);
        const hours = rentalDurationHours(booking.startDate.toISOString().slice(0, 10), booking.endDate.toISOString().slice(0, 10), travel.pickupTime, travel.dropoffTime);
        if (hours > 24) patch.routePricing = { status: "QUOTATION_REQUIRED", reason: "Trips longer than 24 hours require an admin quotation." };
        else if (!config.enabled) patch.routePricing = { status: "QUOTATION_REQUIRED", reason: "Please request an admin quotation for this with-driver trip." };
        else {
          try {
            const route = await drivingDistance(travel.destination, config.originAddress, true);
            patch.routePricing = calculateDistancePrice({ distanceMeters: route.distanceMeters, durationHours: hours, destination: route.destinationArea, config, feeMinor: booking.feeMinor, depositMinor: booking.depositMinor, useReferenceRates: booking.vehicle.model.slug.includes("innova") });
          } catch {
            patch.routePricing = { status: "QUOTATION_REQUIRED", reason: "A route price could not be verified. Please request an admin quotation." };
          }
        }
      }
      nextStep = 2;
    } else {
      if (!existing.service || !existing.travel) return { error: "Complete selection and travel details first." };
      {
        const withDriver = existing.service === "WITH_DRIVER";
        const governmentIdType = withDriver ? undefined : governmentIdTypeSchema.parse(form.get("governmentIdType"));
        const driverIdType = withDriver ? driverIdTypeSchema.parse(form.get("driverIdType")) : undefined;
        const driverRequest = withDriver ? z.object({ meetupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose your meetup time."), notes: z.string().trim().max(2000) }).parse({ meetupTime: form.get("meetupTime"), notes: form.get("requestNotes") ?? "" }) : undefined;
        const documents = { ...existing.documents };
        const pending: { key: string; file: File; bytes: Uint8Array; contentType: string; extension: string }[] = [];
        for (const requirement of (withDriver ? driverDocuments : selfDriveDocuments)) {
          const file = form.get(requirement.key);
          if (!(file instanceof File) || !file.size) {
            if (!documents[requirement.key]) return { error: `Please upload ${requirement.label.toLowerCase()}.` };
            continue;
          }
          if (file.size > 5 * 1024 * 1024) return { error: `${requirement.label} must be 5 MB or smaller.` };
          const { bytes } = await sanitizeImageUpload(file);
          const jpeg = bytes[0] === 255;
          pending.push({ key: requirement.key, file, bytes, contentType: jpeg ? "image/jpeg" : "image/png", extension: jpeg ? "jpg" : "png" });
        }
        const client = await supabase();
        let licenseIdentity: { name: string; licenseNumber: string } | undefined;
        if (!withDriver) {
          async function imageBytes(key: "license" | "ltms") {
            const replacement = pending.find(item => item.key === key);
            if (replacement) return replacement.bytes;
            const saved = documents[key];
            if (!saved?.path.startsWith(`${user.id}/${id}/`)) throw new LicenseReadError("Please upload both your driver's license and LTMS active digital ID image.");
            const { data, error } = await client.storage.from("booking-requirements").download(saved.path);
            if (error || !data || data.size > 5 * 1024 * 1024) throw new LicenseReadError("Could not read the saved license documents. Please upload both images again.");
            return new Uint8Array(await data.arrayBuffer());
          }
          const { checkLicenseImages } = await import("@/lib/license-ocr");
          licenseIdentity = await checkLicenseImages(await imageBytes("license"), await imageBytes("ltms"));
        }
        cleanup = () => client.storage.from("booking-requirements").remove(uploaded);
        for (const item of pending) {
          const path = `${user.id}/${id}/${randomUUID()}.${item.extension}`;
          const { error } = await client.storage.from("booking-requirements").upload(path, item.bytes, { contentType: item.contentType, upsert: false });
          if (error) throw new Error("Documents could not be uploaded. Please try again.");
          uploaded.push(path);
          documents[item.key] = { path, name: item.file.name.slice(0, 200), uploadedAt: new Date().toISOString() } satisfies BookingDocument;
        }
        patch = { ...(withDriver ? { driverIdType, driverRequest } : { governmentIdType, licenseVerification: { version: 1 as const, ...licenseIdentity!, licensePath: documents.license.path, ltmsPath: documents.ltms.path, ltmsActive: true as const, checkedAt: new Date().toISOString() } }), documents: Object.fromEntries(pending.map(item => [item.key, documents[item.key]])), requirementsSubmittedAt: new Date().toISOString(), privacyConsent: form.get("privacyConsent") === "yes" ? { version: 1, acceptedAt: new Date().toISOString(), service: existing.service } : undefined };
      }
      nextStep = patch.privacyConsent ? 3 : 2;
    }
    const updated = await db.$transaction(async tx => {
      if (selectedDates) await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${booking.vehicleId}::uuid FOR UPDATE`;
      const rows = await tx.$queryRaw<{ id: string; status: string }[]>`SELECT id, status FROM "Booking" WHERE id = ${id}::uuid AND "customerId" = ${user.id}::uuid FOR UPDATE`;
      if (!rows.length) throw new Error("This booking can no longer be edited.");
      if (step === "payment" ? !["PENDING", "CONFIRMED", "DELIVERED"].includes(rows[0].status) : rows[0].status !== "PENDING") throw new Error("This booking can no longer be edited.");
      if (step === "payment" && patch.paymentProof) {
        const current = await tx.booking.findUniqueOrThrow({ where: { id }, select: { totalMinor: true, currency: true } });
        const paid = await tx.paymentRecord.aggregate({ where: { bookingId: id, currency: current.currency, status: "PAID" }, _sum: { amountMinor: true } });
        const depositError = reservationDepositError(current.totalMinor, paid._sum.amountMinor ?? 0, patch.paymentProof.amountMinor);
        if (depositError) throw new Error("This booking can no longer be edited.");
      }
      if (selectedDates) {
        const startDate = new Date(selectedDates.start), endDate = new Date(selectedDates.end);
        const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: booking.vehicleId } });
        const conflicts = await tx.booking.count({ where: { id: { not: id }, vehicleId: booking.vehicleId, status: { in: ["CONFIRMED", "DELIVERED"] }, startDate: { lt: endDate }, endDate: { gt: startDate } } });
        const blocks = await tx.availabilityBlock.count({ where: { vehicleId: booking.vehicleId, startDate: { lt: endDate }, endDate: { gt: startDate } } });
        if (vehicle.archived || vehicle.status !== "ACTIVE" || conflicts || blocks) throw new Error("These dates are unavailable. Please select another period.");
        const quote = calculatePrice(selectedDates.start, selectedDates.end, booking.dailyMinor, booking.feeMinor, booking.depositMinor);
        await tx.booking.update({ where: { id }, data: { startDate, endDate, totalMinor: quote.total } });
      }
      const current = await tx.bookingWorkflow.findUnique({ where: { bookingId: id } });
      const currentData = workflowData(current?.data);
      if (step !== "selection" && currentData.service !== existing.service) throw new Error("This booking can no longer be edited.");
      if (step === "payment" && currentData.paymentProof?.document.uploadedAt !== existing.paymentProof?.document.uploadedAt) throw new Error("This booking can no longer be edited.");
      if (step === "requirements" && ["license", "ltms", "driverValidId"].some(key => currentData.documents?.[key]?.path !== existing.documents?.[key]?.path)) throw new Error("This booking can no longer be edited.");
      const data = { ...currentData, ...patch, ...(patch.documents ? { documents: { ...currentData.documents, ...patch.documents } } : {}) };
      if (patch.routePricing?.status === "READY" && patch.routePricing.totalMinor !== undefined) {
        const currentBooking = await tx.booking.findUniqueOrThrow({ where: { id }, select: { startDate: true, endDate: true } });
        if (currentBooking.startDate.getTime() !== booking.startDate.getTime() || currentBooking.endDate.getTime() !== booking.endDate.getTime()) throw new Error("This booking can no longer be edited.");
        const paid = await tx.paymentRecord.count({ where: { bookingId: id, status: "PAID" } });
        if (paid || currentData.paymentProof?.status === "PENDING") throw new Error("This booking can no longer be edited.");
        await tx.booking.update({ where: { id }, data: { totalMinor: patch.routePricing.totalMinor } });
      }
      await tx.bookingWorkflow.upsert({ where: { bookingId: id }, create: { bookingId: id, data: JSON.parse(JSON.stringify(data)) }, update: { data: JSON.parse(JSON.stringify(data)) } });
      return data;
    });
    revalidatePath(`/bookings/${id}`);
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/fleet", "layout");
    return { data: updated, nextStep };
  } catch (error) {
    if (uploaded.length && cleanup) await cleanup().catch(() => {});
    return { error: (error instanceof ImageUploadError || error instanceof ReceiptReadError || error instanceof LicenseReadError) ? error.message : error instanceof z.ZodError ? error.issues[0]?.message ?? "Check your details." : error instanceof Error && ["These dates are unavailable. Please select another period.", "Documents could not be uploaded. Please try again.", "This booking can no longer be edited."].includes(error.message) ? error.message : "Could not save your booking details. Please try again." };
  }
}

export async function scanLicenseUpload(form: FormData): Promise<{ details?: { name: string; licenseNumber: string }; data?: WorkflowData; error?: string }> {
  const user = await requireClient("/bookings");
  const startedAt = Date.now();
  let cleanup: (() => Promise<unknown>) | undefined;
  try {
    await enforceRateLimit("document-scans", user.id, 8);
    const id = z.uuid().parse(form.get("bookingId"));
    const kind = z.enum(["license", "ltms"]).parse(form.get("kind"));
    const booking = await db.booking.findFirst({ where: { id, customerId: user.id, status: "PENDING" }, include: { workflow: true } });
    if (!booking || workflowData(booking.workflow?.data).service !== "SELF_DRIVE") return { error: "This booking is not available for self-drive document scanning." };
    const file = form.get("document");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return { error: "Choose a JPEG or PNG image of 5 MB or smaller." };
    const { bytes } = await sanitizeImageUpload(file);
    const { extractLicenseImage } = await import("@/lib/license-ocr");
    const details = await extractLicenseImage(bytes, kind === "ltms");
    const client = await supabase();
    const path = `${user.id}/${id}/${randomUUID()}.${bytes[0] === 255 ? "jpg" : "png"}`;
    const { error } = await client.storage.from("booking-requirements").upload(path, bytes, { contentType: bytes[0] === 255 ? "image/jpeg" : "image/png", upsert: false });
    if (error) return { error: "The image passed OCR but could not be saved. Please select it again to retry." };
    cleanup = () => client.storage.from("booking-requirements").remove([path]);
    const data = await db.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM "Booking" WHERE id = ${id}::uuid AND "customerId" = ${user.id}::uuid FOR UPDATE`;
      if (rows[0]?.status !== "PENDING") throw new LicenseReadError("This booking can no longer be edited.");
      const current = workflowData((await tx.bookingWorkflow.findUnique({ where: { bookingId: id } }))?.data);
      const updated = saveLicenseOcrDraft(current, kind, { path, name: file.name.slice(0, 200), uploadedAt: new Date().toISOString() }, details, startedAt);
      await tx.bookingWorkflow.upsert({ where: { bookingId: id }, create: { bookingId: id, data: JSON.parse(JSON.stringify(updated)) }, update: { data: JSON.parse(JSON.stringify(updated)) } });
      return updated;
    });
    cleanup = undefined;
    revalidatePath(`/bookings/${id}`);
    revalidatePath("/admin", "layout");
    return { details, data };
  } catch (error) {
    if (cleanup) await cleanup().catch(() => {});
    return { error: (error instanceof ImageUploadError || error instanceof LicenseReadError) ? error.message : "Could not scan and save this document. Please select the image again to retry." };
  }
}


export async function saveSupportingDocument(form: FormData): Promise<BookingStepResult> {
  const user = await requireClient("/bookings");
  let cleanup: (() => Promise<unknown>) | undefined;
  try {
    await enforceRateLimit("document-uploads", user.id, 12);
    const id = z.uuid().parse(form.get("bookingId"));
    const kind = z.enum(["governmentId1", "billing"]).parse(form.get("kind"));
    const idType = form.get("governmentIdType");
    const governmentIdType = kind === "governmentId1" && idType ? governmentIdTypeSchema.parse(idType) : undefined;
    const booking = await db.booking.findFirst({ where: { id, customerId: user.id, status: "PENDING" }, include: { workflow: true } });
    if (!booking || workflowData(booking.workflow?.data).service !== "SELF_DRIVE") return { error: "This booking is not available for document uploads." };
    const file = form.get("document");
    let document: BookingDocument | undefined;
    if (file instanceof File && file.size) {
      if (file.size > 5 * 1024 * 1024) return { error: "Choose a JPEG or PNG image of 5 MB or smaller." };
      const { bytes } = await sanitizeImageUpload(file);
      const jpeg = bytes[0] === 255;
      const client = await supabase();
      const path = `${user.id}/${id}/${randomUUID()}.${jpeg ? "jpg" : "png"}`;
      const { error } = await client.storage.from("booking-requirements").upload(path, bytes, { contentType: jpeg ? "image/jpeg" : "image/png", upsert: false });
      if (error) return { error: "Could not save this document. Please select it again to retry." };
      cleanup = () => client.storage.from("booking-requirements").remove([path]);
      document = { path, name: file.name.slice(0, 200), uploadedAt: new Date().toISOString() };
    } else if (!governmentIdType) return { error: "Select a document to upload." };
    const data = await db.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM "Booking" WHERE id = ${id}::uuid AND "customerId" = ${user.id}::uuid FOR UPDATE`;
      if (rows[0]?.status !== "PENDING") throw new Error("This booking can no longer be edited.");
      const current = workflowData((await tx.bookingWorkflow.findUnique({ where: { bookingId: id } }))?.data);
      const updated = saveSupportingDocumentDraft(current, kind, document, governmentIdType);
      await tx.bookingWorkflow.upsert({ where: { bookingId: id }, create: { bookingId: id, data: JSON.parse(JSON.stringify(updated)) }, update: { data: JSON.parse(JSON.stringify(updated)) } });
      return updated;
    });
    cleanup = undefined;
    revalidatePath(`/bookings/${id}`);
    revalidatePath("/admin", "layout");
    return { data };
  } catch (error) {
    if (cleanup) await cleanup().catch(() => {});
    return { error: error instanceof ImageUploadError ? error.message : error instanceof z.ZodError ? error.issues[0]?.message : "Could not save your document. Please select it again to retry." };
  }
}

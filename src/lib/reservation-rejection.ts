import { z } from "zod";
import type { WorkflowData } from "./booking-workflow";

export const rejectionReasonSchema = z.string().trim().min(1, "Enter a reason for rejecting this reservation.").max(500, "Keep the rejection reason to 500 characters or fewer.");
export function rejectionReason(data: WorkflowData): string | null {
  const reason = data.rejection?.reason ?? (data.paymentProof?.status === "REJECTED" ? data.paymentProof.reviewNote : undefined);
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
}

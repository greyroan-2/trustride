import type { BookingDocument, WorkflowData } from "./booking-workflow";

export function saveSupportingDocumentDraft(current: WorkflowData, kind: "governmentId1" | "billing", document?: BookingDocument, governmentIdType?: string): WorkflowData {
  if (current.service !== "SELF_DRIVE") throw new Error("The rental type has changed. Please refresh your booking.");
  return {
    ...current,
    ...(document ? { documents: { ...current.documents, [kind]: document } } : {}),
    ...(kind === "governmentId1" && governmentIdType ? { governmentIdType } : {}),
    requirementsSubmittedAt: "",
  };
}

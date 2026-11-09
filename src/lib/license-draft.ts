import { LicenseReadError, matchLicenseIdentities, type LicenseIdentity } from "./license-parser";
import type { BookingDocument, WorkflowData } from "./booking-workflow";

export function saveLicenseOcrDraft(current: WorkflowData, kind: "license" | "ltms", document: BookingDocument, details: LicenseIdentity, startedAt: number): WorkflowData {
  if (current.service !== "SELF_DRIVE") throw new LicenseReadError("The rental type has changed. Please refresh your booking.");
  if ((current.documentOcr?.[kind]?.scanStartedAt ?? 0) > startedAt) throw new LicenseReadError("A newer image has already been saved.");
  const checkedAt = document.uploadedAt;
  const documents = { ...current.documents, [kind]: document };
  const documentOcr = { ...current.documentOcr, [kind]: { ...details, path: document.path, checkedAt, scanStartedAt: startedAt, ...(kind === "ltms" ? { ltmsActive: true } : {}) } };
  const updated: WorkflowData = { ...current, documents, documentOcr, requirementsSubmittedAt: "", licenseVerification: undefined };
  const license = documentOcr.license, ltms = documentOcr.ltms;
  if (license && ltms?.ltmsActive && license.path === documents.license?.path && ltms.path === documents.ltms?.path) {
    try {
      const identity = matchLicenseIdentities(license, ltms);
      updated.licenseVerification = { version: 1, ...identity, licensePath: license.path, ltmsPath: ltms.path, ltmsActive: true, checkedAt };
    } catch (error) { if (!(error instanceof LicenseReadError)) throw error; }
  }
  return updated;
}

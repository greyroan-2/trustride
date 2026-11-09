import { test } from "node:test";
import assert from "node:assert/strict";
import { saveLicenseOcrDraft } from "../src/lib/license-draft";
import { hasSelfDriveLicenseMatch, type WorkflowData } from "../src/lib/booking-workflow";
const details = { name: "DOE, JANE MARIE", licenseNumber: "A01-23-123456" };
const document = (path: string) => ({ path, name: "id.png", uploadedAt: "2026-11-08T00:00:00Z" });
test("OCR drafts survive workflow JSON serialization without submitting requirements", () => {
  const updated = saveLicenseOcrDraft({ service: "SELF_DRIVE", governmentIdType: "Philippine Passport", requirementsSubmittedAt: "old", travel: { contactName: "Jane", phone: "+639123456789", pickupLocation: "Manila", destination: "Tagaytay", pickupTime: "09:00", dropoffTime: "17:00", passengers: 2 } }, "license", document("license.png"), details, 10);
  const restored: WorkflowData = JSON.parse(JSON.stringify(updated));
  assert.equal(restored.documents?.license.path, "license.png");
  assert.deepEqual(restored.documentOcr?.license.name, details.name);
  assert.equal(restored.requirementsSubmittedAt, "");
  assert.equal(restored.governmentIdType, "Philippine Passport");
  assert.equal(restored.travel?.contactName, "Jane");
  assert.equal(hasSelfDriveLicenseMatch(restored), false);
});
test("matching files are restored as matched in either upload order", () => {
  for (const order of [["license", "ltms"], ["ltms", "license"]] as const) {
    let saved: WorkflowData = { service: "SELF_DRIVE" };
    for (const kind of order) saved = saveLicenseOcrDraft(saved, kind, document(`${kind}.png`), details, 10);
    assert.equal(hasSelfDriveLicenseMatch(JSON.parse(JSON.stringify(saved))), true);
    assert.equal(saved.requirementsSubmittedAt, "");
  }
});
test("replacement clears the old match and stale scans cannot overwrite the newer file", () => {
  let saved: WorkflowData = { service: "SELF_DRIVE" };
  saved = saveLicenseOcrDraft(saved, "license", document("license.png"), details, 10);
  saved = saveLicenseOcrDraft(saved, "ltms", document("ltms.png"), details, 10);
  saved = saveLicenseOcrDraft(saved, "license", document("new.png"), { ...details, licenseNumber: "B01-23-123456" }, 20);
  assert.equal(hasSelfDriveLicenseMatch(saved), false);
  assert.throws(() => saveLicenseOcrDraft(saved, "license", document("old.png"), details, 15), /newer image/);
  assert.throws(() => saveLicenseOcrDraft({ service: "WITH_DRIVER" }, "license", document("old.png"), details, 15), /rental type/);
});

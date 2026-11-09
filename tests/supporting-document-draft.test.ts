import { test } from "node:test";
import assert from "node:assert/strict";
import { saveSupportingDocumentDraft } from "../src/lib/supporting-document-draft";
import type { WorkflowData } from "../src/lib/booking-workflow";

const doc = (name: string) => ({ path: `customer/booking/${name}.png`, name, uploadedAt: "2026-11-09T01:00:00Z" });
test("ID and billing drafts preserve existing documents and each other", () => {
  const current: WorkflowData = { service: "SELF_DRIVE", documents: { license: doc("license"), ltms: doc("ltms") }, requirementsSubmittedAt: "previous" };
  const withId = saveSupportingDocumentDraft(current, "governmentId1", doc("id"), "Philippine Passport");
  const withBilling = saveSupportingDocumentDraft(withId, "billing", doc("bill"));
  assert.deepEqual(withBilling.documents, { ...current.documents, governmentId1: doc("id"), billing: doc("bill") });
  assert.equal(withBilling.governmentIdType, "Philippine Passport");
  assert.equal(withBilling.requirementsSubmittedAt, "");
  assert.equal(current.documents?.governmentId1, undefined);
});
test("changing ID type preserves saved files without marking requirements submitted", () => {
  const current: WorkflowData = { service: "SELF_DRIVE", documents: { governmentId1: doc("id"), billing: doc("bill") }, governmentIdType: "Philippine Passport", requirementsSubmittedAt: "previous" };
  const updated = saveSupportingDocumentDraft(current, "governmentId1", undefined, "Philippine National ID");
  assert.deepEqual(updated.documents, current.documents);
  assert.equal(updated.governmentIdType, "Philippine National ID");
  assert.equal(updated.requirementsSubmittedAt, "");
});
test("a changed rental type rejects self-drive document drafts", () => {
  assert.throws(() => saveSupportingDocumentDraft({ service: "WITH_DRIVER" }, "billing", doc("bill")), /rental type has changed/);
});

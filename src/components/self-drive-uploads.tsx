"use client";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { scanLicenseUpload, saveSupportingDocument } from "@/app/actions/booking-details";
import { governmentIdTypes, selfDriveDocuments, hasSelfDriveLicenseMatch, type WorkflowData } from "@/lib/booking-workflow";
import { matchLicenseIdentities } from "@/lib/license-parser";
import { DocumentPreview, DocumentUpload } from "./document-upload";
import { PortalReference } from "./portal-reference";
import { LicenseUploadFeedback, type LicenseReadState } from "./license-upload-feedback";

type Reads = Partial<Record<"license" | "ltms", LicenseReadState>>;
const documentOrder = ["license", "ltms", "governmentId1", "billing"];
const orderedDocuments = [...selfDriveDocuments].sort((a, b) => documentOrder.indexOf(a.key) - documentOrder.indexOf(b.key));
export function SelfDriveUploads({ bookingId, data, onSaved, onBusy, onError }: { bookingId: string; data: WorkflowData; onSaved: (data: WorkflowData) => void; onBusy: (busy: boolean) => void; onError: (message: string | null) => void }) {
  const [reads, setReads] = useState<Reads>(() => {
    const restored: Reads = {};
    for (const kind of ["license", "ltms"] as const) {
      const result = data.documentOcr?.[kind];
      if (result && result.path === data.documents?.[kind]?.path) restored[kind] = { details: { name: result.name, licenseNumber: result.licenseNumber } };
    }
    if (hasSelfDriveLicenseMatch(data) && data.licenseVerification) {
      const details = { name: data.licenseVerification.name, licenseNumber: data.licenseVerification.licenseNumber };
      return { license: { details }, ltms: { details } };
    }
    return restored;
  });
  const [governmentIdType, setGovernmentIdType] = useState(data.governmentIdType ?? "");
  const [saving, setSaving] = useState<Record<string, number>>({});
  const queue = useRef(Promise.resolve());
  const queued = useRef(0);
  function enqueue(kind: string, task: () => Promise<void>) {
    queued.current += 1;
    onBusy(true);
    setSaving(previous => ({ ...previous, [kind]: (previous[kind] ?? 0) + 1 }));
    queue.current = queue.current.then(async () => {
      if (!active.current) return;
      try { await task(); }
      catch { if (active.current) onError("Could not save this document. Please select it again to retry."); }
      finally {
        queued.current -= 1;
        if (active.current) { setSaving(previous => ({ ...previous, [kind]: previous[kind] - 1 })); onBusy(queued.current > 0); }
      }
    });
  }
  async function saveSupporting(kind: "governmentId1" | "billing", file: File | null, idType = governmentIdType) {
    onError(null);
    const form = new FormData();
    form.set("bookingId", bookingId); form.set("kind", kind);
    if (file) form.set("document", file);
    if (kind === "governmentId1" && idType) form.set("governmentIdType", idType);
    const result = await saveSupportingDocument(form);
    if (!active.current) return;
    if (result.data) onSaved(result.data);
    if (result.error) onError(result.error);
  }
  const latest = useRef(reads);
  const generation = useRef({ license: 0, ltms: 0 });
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; onBusy(false); }; }, [onBusy]);
  let matched = false;
  let mismatch: string | undefined;
  if (reads.license?.details && reads.ltms?.details) {
    try { matchLicenseIdentities(reads.license.details, reads.ltms.details); matched = true; }
    catch (error) { mismatch = error instanceof Error ? error.message : "The documents do not match."; }
  }
  async function scan(kind: "license" | "ltms", file: File | null) {
    const request = ++generation.current[kind];
    const update = (state: LicenseReadState | undefined) => { latest.current = { ...latest.current, [kind]: state }; setReads(latest.current); onBusy(queued.current > 0 || Object.values(latest.current).some(read => read?.scanning)); };
    onError(null);
    if (!file) { update(undefined); return; }
    update({ scanning: true });
    try {
      const form = new FormData(); form.set("bookingId", bookingId); form.set("kind", kind); form.set("document", file);
      const result = await scanLicenseUpload(form);
      if (!active.current || generation.current[kind] !== request) return;
      if (result.data) onSaved(result.data);
      update(result);
      if (result.error) onError(result.error);
      else if (latest.current.license?.details && latest.current.ltms?.details) {
        try { matchLicenseIdentities(latest.current.license.details, latest.current.ltms.details); }
        catch (error) { onError(error instanceof Error ? error.message : "The documents do not match."); }
      }
    } catch {
      if (!active.current || generation.current[kind] !== request) return;
      const error = "Could not scan this image. Please choose it again to retry.";
      update({ error }); onError(error);
    }
  }
  return <><div className="booking-upload-intro">Up to 5 MB per document. License and LTMS: JPEG or PNG only. Name, license number, and active status are checked after selection and again when you submit. All documents and your ID type are saved automatically; wait for the green result before reloading. Admin review is still required.</div><div className="booking-upload-grid">{orderedDocuments.map(document => {
    const scanned = document.key === "license" || document.key === "ltms";
    const read = scanned ? reads[document.key as "license" | "ltms"] : undefined;
    const accepted = !saving[document.key] && (scanned ? Boolean(read?.details && (document.key === "license" || matched)) : Boolean(data.documents?.[document.key]));
    return <div className={`booking-document-upload${accepted ? " document-accepted" : ""}`} key={document.key}><div className="booking-document-heading"><label className="booking-document-title" htmlFor={`document-${document.key}`}><strong>{document.label}</strong>{!data.documents?.[document.key] && <span className="required-star" aria-hidden="true">*</span>}</label>{document.key === "ltms" && <PortalReference />}</div><span>{document.hint}</span>{saving[document.key] > 0 && <small role="status">Checking and saving...</small>}{scanned && <LicenseUploadFeedback state={read} digital={document.key === "ltms"} matched={matched} mismatch={mismatch} />}<div className={`booking-upload-control${document.key === "governmentId1" ? " booking-id-upload-row" : ""}`}>{data.documents?.[document.key] && <div className="booking-upload-saved"><Check size={14} /><span title={data.documents[document.key].name}>{data.documents[document.key].name}</span><DocumentPreview src={`/api/bookings/${bookingId}/documents/${document.key}`} name={data.documents[document.key].name} pdf={data.documents[document.key].path.endsWith(".pdf")} label="View saved image" /></div>}{document.key === "governmentId1" && <label className="booking-government-id-type" data-hide-required>ID type<select name="governmentIdType" value={governmentIdType} onChange={event => { const value = event.target.value; setGovernmentIdType(value); enqueue("governmentId1", () => saveSupporting("governmentId1", null, value)); }} required><option value="" disabled>Select government ID</option>{governmentIdTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label>}<DocumentUpload id={`document-${document.key}`} name={document.key} accept={scanned ? "image/jpeg,image/png" : "image/jpeg,image/png"} required={!data.documents?.[document.key]} hideSelectedPreview={accepted && Boolean(data.documents?.[document.key])} onFileSelect={file => { if (!file) return; if (scanned) enqueue(document.key, () => scan(document.key as "license" | "ltms", file)); else enqueue(document.key, () => saveSupporting(document.key as "governmentId1" | "billing", file)); }} /></div></div>;
  })}</div></>;
}

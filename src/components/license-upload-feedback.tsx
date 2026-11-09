import { CheckCircle2, LoaderCircle, AlertCircle } from "lucide-react";
import type { LicenseIdentity } from "@/lib/license-parser";
export type LicenseReadState = { scanning?: boolean; details?: LicenseIdentity; error?: string };
export function LicenseUploadFeedback({ state, digital, matched, mismatch }: { state?: LicenseReadState; digital: boolean; matched: boolean; mismatch?: string }) {
  if (!state) return null;
  if (state.scanning) return <div className="license-upload-feedback scanning" role="status"><LoaderCircle size={17} className="license-scan-spinner" /><span>Reading name{digital ? ", license number, and active status" : " and license number"}...</span></div>;
  if (state.error) return <div className="license-upload-feedback failed"><AlertCircle size={17} /><span>{state.error}</span></div>;
  if (!state.details) return null;
  const accepted = !digital || matched;
  return <div className={`license-upload-feedback ${accepted ? "accepted" : mismatch ? "failed" : "waiting"}`} role="status"><div className="license-feedback-heading">{accepted ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<strong>{digital ? matched ? "LTMS matched and saved" : mismatch ? "Details do not match" : "Active ID read - awaiting license match" : "License accepted and saved"}</strong></div><dl><div><dt>Extracted name</dt><dd>{state.details.name}</dd></div><div><dt>License number</dt><dd>{state.details.licenseNumber}</dd></div></dl>{digital && <small>{mismatch || (matched ? "Active status detected; name and license number match." : "Active status detected. Add your license to compare.")}</small>}</div>;
}

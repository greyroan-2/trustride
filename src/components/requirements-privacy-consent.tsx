"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

export function RequirementsPrivacyConsent({ storageKey, ready, accepted, onConsentChange }: { storageKey: string; ready: boolean; accepted: boolean; onConsentChange: (checked: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState(accepted);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        const restored = saved === null ? accepted : saved === "yes";
        setChecked(restored);
        onConsentChange(restored);
      } catch {
        onConsentChange(accepted);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey, accepted, onConsentChange]);
  function updateConsent(value: boolean) {
    try { localStorage.setItem(storageKey, value ? "yes" : "no"); } catch { /* Consent still submits with the form when browser storage is unavailable. */ }
    setChecked(value);
    onConsentChange(value);
  }
  function close() {
    dialog.current?.close();
    if (checked && ready) container.current?.closest("form")?.requestSubmit();
  }
  return <div ref={container} className="requirements-privacy" data-consented={checked}>
    <input type="hidden" name="privacyConsent" value={checked ? "yes" : "no"} />
    <label className="requirements-privacy-check"><span className="requirements-privacy-checkbox"><input type="checkbox" checked={checked} onChange={event => updateConsent(event.target.checked)} /><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 3.5 3.5 8-8" /></svg></span><span>I have read the privacy notice and consent to the use of my submitted information solely to verify me as a client.</span></label>
    <button type="button" className="requirements-privacy-link" onClick={() => dialog.current?.showModal()}>Read the Data Privacy Act notice</button>
    <dialog ref={dialog} className="requirements-privacy-dialog" aria-labelledby="requirements-privacy-title" onCancel={event => { event.preventDefault(); close(); }}>
      <ShieldCheck size={32} aria-hidden="true" />
      <h2 id="requirements-privacy-title">Your information, protected</h2>
      <p className="requirements-privacy-subtitle">Data Privacy Act of 2012 · Republic Act No. 10173</p>
      <p>TrustRide collects and uses the personal information and documents you provide in these requirements solely to verify your identity and eligibility as a client.</p>
      <p>The Data Privacy Act requires appropriate safeguards against unauthorized access, use, and disclosure. Your submitted information must be kept confidential, accessed only by authorized people for verification, and retained only as long as necessary or required by law.</p>
      <p>You have rights to access and correct your personal information and to raise privacy concerns. Contact TrustRide to exercise these rights or ask about withdrawing consent.</p>
      <a href="/privacy" target="_blank" rel="noreferrer">Read the full TrustRide Privacy Policy &#8599;</a>
      <label className="requirements-privacy-check"><span className="requirements-privacy-checkbox"><input type="checkbox" checked={checked} onChange={event => updateConsent(event.target.checked)} /><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 3.5 3.5 8-8" /></svg></span><span>I have read this notice and consent to TrustRide using my submitted information solely for client verification.</span></label>
      <p className="requirements-privacy-hint">{checked ? ready ? "Consent checked. Close this notice to save and proceed to payment." : "Consent checked. Submit your requirements to continue to payment." : "Please check the box to continue to payment. Closing without consent keeps you on requirements."}</p>
      <div className="requirements-privacy-actions"><button type="button" className="button requirements-privacy-dismiss" onClick={close}>Close</button></div>
    </dialog>
  </div>;
}


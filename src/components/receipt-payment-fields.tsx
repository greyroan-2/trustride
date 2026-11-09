"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { scanPaymentReceipt } from "@/app/actions/booking-details";
import { DocumentUpload } from "@/components/document-upload";

export function ReceiptPaymentFields({ bookingId, currency, pending }: { bookingId: string; currency: string; pending: boolean }) {
  const [details, setDetails] = useState<{ amount: string; reference: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const job = useRef(0);
  useEffect(() => () => { job.current++; }, []);
  async function scan(file: File | null) {
    const current = ++job.current;
    setDetails(null); setError(""); setScanning(false);
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) { setError("Upload a JPEG or PNG receipt image for automatic reading."); return; }
    setScanning(true);
    const form = new FormData(); form.set("bookingId", bookingId); form.set("receipt", file);
    try {
      const result = await scanPaymentReceipt(form);
      if (current !== job.current) return;
      if (result.amount && result.reference) setDetails({ amount: result.amount, reference: result.reference });
      else setError(result.error ?? "Could not read this receipt. Please upload a clearer image.");
    } catch { if (current === job.current) setError("Receipt scanning is temporarily unavailable. Please try selecting the image again."); }
    finally { if (current === job.current) setScanning(false); }
  }
  return <>
    <label><span className="required-field-label">Amount paid ({currency})</span><input name="paymentAmount" value={details?.amount ?? ""} readOnly required placeholder="Read automatically from receipt" aria-label="Amount paid, automatically extracted from receipt" /></label>
    <label><span className="required-field-label">Payment reference</span><input name="paymentReference" value={details?.reference ?? ""} readOnly required placeholder="Read automatically from receipt" aria-label="Payment reference, automatically extracted from receipt" /></label>
    <label className="booking-transfer-receipt"><span className="required-field-label">Transfer receipt</span><span>JPEG or PNG · Up to 5 MB · Include the amount and reference number</span><DocumentUpload id="payment-receipt" name="paymentProof" accept="image/jpeg,image/png" required onFileSelect={scan} /></label>
    <div className={`receipt-scan-status${error ? " error" : ""}`} role={error ? "alert" : "status"}>{scanning && <LoaderCircle size={16} className="receipt-scan-spinner" />}<span>{scanning ? "Reading the receipt amount and reference number…" : error || (details ? "Amount and reference extracted. Double-check the receipt before submitting." : "Upload a receipt image to fill the payment details automatically.")}</span></div>
    <label className="booking-confirmation"><input type="checkbox" name="nonRefundableAccepted" value="yes" required /><span>I understand that the 50% reservation payment is non-refundable.</span></label>
    <p className="booking-transfer-review-note">The server checks the receipt again on submission. Admin approval is required before payment is recorded.</p>
    <button type="submit" disabled={pending || scanning || !details}>{pending ? "Submitting…" : scanning ? "Reading receipt…" : "Submit payment proof"}<ArrowRight size={15} /></button>
  </>;
}

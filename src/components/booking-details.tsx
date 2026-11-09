"use client";
import { RequirementsPrivacyConsent } from "./requirements-privacy-consent";
import { SelfDriveUploads } from "./self-drive-uploads";
import { ErrorPopup } from "./error-popup";
import { DestinationDistanceField } from "./destination-distance-field";
import { BookingTimePicker } from "./booking-time-picker";
import { BookingDatePicker } from "./booking-date-picker";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import gcashQr from "../../public/images/gcash-transfer.jpg";
import bankQr from "../../public/images/bank-transfer.jpg";
import { ArrowLeft, ArrowRight, Check, CarFront, UserRound } from "lucide-react";
import { saveBookingDetails, type BookingStepResult } from "@/app/actions/booking-details";
import { ReservationCancellation } from "./reservation-cancellation";
import { driverIdTypes, hasRequiredDriverId, hasSelfDriveLicenseMatch, type WorkflowData } from "@/lib/booking-workflow";
import { reservationDepositMinor } from "@/lib/reservation-deposit";
import { money } from "@/lib/validation";
import { BookingRefresh } from "@/components/booking-refresh";
import { DocumentPreview, DocumentUpload } from "@/components/document-upload";
import { ReceiptPaymentFields } from "@/components/receipt-payment-fields";

type BookingInfo = { id: string; reference: string; name: string; status: string; start: string; end: string; daily: number; fee: number; deposit: number; total: number; currency: string; cancellationRequested: boolean; customerName: string; phone: string; seats: number | null; paid: number };
const steps = ["Selection", "Travel details", "Requirements", "Payment progress"];
export function BookingDetails({ booking: b, initialData, initialStep }: { booking: BookingInfo; initialData: WorkflowData; initialStep?: number }) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(b.start);
  const [endDate, setEndDate] = useState(b.end);
  const [data, setData] = useState(initialData);
  const [step, setStep] = useState(initialStep ?? (initialData.privacyConsent?.service === initialData.service && initialData.requirementsSubmittedAt && hasRequiredDriverId(initialData) && hasSelfDriveLicenseMatch(initialData) ? 3 : initialData.travel ? 2 : initialData.service ? 1 : 0));
  const [service, setService] = useState(initialData.service ?? "SELF_DRIVE");
  const [paymentMethod, setPaymentMethod] = useState("GCASH");
  // Use the latest saved account details until this booking has its own contact details.
  const [enteredPhone, setPhoneDigits] = useState<string | null>(null);
  const phoneDigits = enteredPhone ?? (data.travel?.phone || b.phone).replace(/^\+63/, "").replace(/\D/g, "").slice(0, 11);
  const [privacyChecked, setPrivacyChecked] = useState(Boolean(initialData.privacyConsent && initialData.privacyConsent.service === initialData.service));
  const [documentSaving, setDocumentSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, submit, pending] = useActionState(async (_previous: BookingStepResult, form: FormData) => {
    const saved = await saveBookingDetails(form);
    setErrorMessage(saved.error ?? null);
    if (saved.data) { setPrivacyChecked(Boolean(saved.data.privacyConsent && saved.data.privacyConsent.service === saved.data.service)); setData(saved.data); setStep(saved.nextStep ?? step); router.refresh(); }
    return saved;
  }, {});
  const routePricing = initialData.routePricing ?? data.routePricing;
  const reservationPayment = reservationDepositMinor(b.total);
  const editable = b.status === "PENDING";
  const completed = data.privacyConsent?.service === data.service && data.requirementsSubmittedAt && hasRequiredDriverId(data) && hasSelfDriveLicenseMatch(data) ? 3 : data.travel ? 2 : data.service ? 1 : 0;
  const progress = b.paid >= b.total && completed === 3 ? 100 : completed * 25;
  const days = Math.round((Date.parse(b.end) - Date.parse(b.start)) / 86400000);
  const formatDate = (date: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  const requirements = data.service === "SELF_DRIVE";
  const requirementsComplete = privacyChecked && hasRequiredDriverId(data) && hasSelfDriveLicenseMatch(data) && Boolean(requirements ? data.documents?.license && data.documents?.ltms && data.documents?.governmentId1 && data.documents?.billing && data.governmentIdType : data.documents?.driverValidId);
  const paymentProof = initialData.paymentProof?.reviewedAt && initialData.paymentProof.document.uploadedAt === data.paymentProof?.document.uploadedAt ? initialData.paymentProof : data.paymentProof ?? initialData.paymentProof;
  return (
    <div className="booking-details-screen">
      <BookingRefresh />
      <div className="booking-details-container">
        <Link href="/" className="booking-back-home"><ArrowLeft size={16} />Back to home</Link>
        <div className="booking-details-heading"><div><p>YOUR RESERVATION · {b.reference}</p><h1>{["CONFIRMED","DELIVERED"].includes(b.status) ? "Payment progress" : "Complete your booking"}</h1><span>{b.name} · {formatDate(b.start)} — {formatDate(b.end)}</span></div><span className={`reservation-history-status ${b.status.toLowerCase()}`}>{b.status.toLowerCase()}</span></div>
        <div className="booking-progress-sticky">
        <div className="booking-completion-label"><span>Booking progress</span><strong>{progress}% complete</strong></div>
        <div className="booking-completion-track" role="progressbar" aria-label="Booking completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
        <nav className="booking-steps" aria-label="Booking steps">{steps.map((label, index) => <button key={label} type="button" data-completed={index < completed || (index === 2 && requirementsComplete)} aria-current={step === index ? "step" : undefined} disabled={pending || index > completed} onClick={() => setStep(index)}><span>{index < completed || (index === 2 && requirementsComplete) ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></button>)}</nav>
        </div>
        <div className="booking-details-body">
          <div className="booking-step-intro"><h2>{steps[step]}</h2><p>{["Choose how you want to travel.", "Review your trip and the rental payment breakdown.", requirements ? "Submit clear copies of your self-drive requirements." : "Let us know when to meet you and how we can help.", "Track your reservation review and recorded payments."][step]}</p></div>
          {routePricing?.status === "QUOTATION_REQUIRED" && <p className="booking-step-notice booking-quote-notice" role="status">{routePricing.reason} Complete your details and contact TrustRide. Payment is available after the quotation is ready.</p>}
          {errorMessage && <ErrorPopup message={errorMessage} onDismiss={() => setErrorMessage(null)} />}
          {!editable && <p className="booking-step-notice">This reservation is {b.status.toLowerCase()}. Contact TrustRide to request changes to submitted details.</p>}
          {step < 3 ? <form action={submit} key={`${step}-${data.service ?? "new"}`} className="booking-step-form">
            <input type="hidden" name="bookingId" value={b.id} /><input type="hidden" name="step" value={["selection", "travel", "requirements"][step]} />
            <fieldset disabled={pending || !editable} className="booking-step-fields">
            {step === 0 && <><div className="booking-date-selection"><div className="booking-date-time-card"><BookingDatePicker label="Pickup date" name="start" value={startDate} min={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} onChange={setStartDate} /><BookingTimePicker name="pickupTime" label="Pickup time" defaultValue={data.schedule?.pickupTime ?? data.travel?.pickupTime ?? "09:00"} /></div><div className="booking-date-time-card"><BookingDatePicker label="Return date" name="end" value={endDate} min={new Date(Date.parse(`${startDate}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)} onChange={setEndDate} /><BookingTimePicker name="dropoffTime" label="Drop-off time" defaultValue={data.schedule?.dropoffTime ?? data.travel?.dropoffTime ?? "09:00"} /></div><small>Availability and your rental total are checked when you continue.</small></div><div className="booking-service-options">{[{ value: "SELF_DRIVE", title: "Self-drive", description: "Take the wheel and travel at your own pace.", Icon: CarFront }, { value: "WITH_DRIVER", title: "With driver", description: "Share your meetup time and travel requests.", Icon: UserRound }].map(({ value, title, description, Icon }) => <label key={value} className={service === value ? "chosen" : ""}><input type="radio" name="service" value={value} checked={service === value} onChange={() => setService(value as typeof service)} /><Icon size={28} /><strong>{title}</strong><span>{description}</span></label>)}</div></>}
            {step === 1 && <div className="booking-travel-layout"><div className="booking-travel-fields"><section className="booking-travel-section"><div className="booking-travel-section-heading"><span>01</span><h3>Contact information</h3></div><div className="booking-travel-section-fields">
              <label>Contact name<input name="contactName" defaultValue={data.travel?.contactName || b.customerName} autoComplete="name" required maxLength={100} /></label>
              <label>Contact number<span className="booking-phone-field"><span>+63</span><input type="tel" inputMode="numeric" pattern="[0-9]{7,11}" value={phoneDigits} onChange={event => setPhoneDigits(event.target.value.replace(/\D/g, "").slice(0, 11))} onKeyDown={event => { if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) event.preventDefault(); }} autoComplete="tel-national" aria-label="Contact number, country code plus 63" required minLength={7} maxLength={11} /><input type="hidden" name="phone" value={`+63${phoneDigits}`} /></span></label>
              </div></section><section className="booking-travel-section"><div className="booking-travel-section-heading"><span>02</span><h3>Your route</h3></div><div className="booking-travel-section-fields booking-route-fields"><label>Pickup location<input name="pickupLocation" defaultValue={data.travel?.pickupLocation} required maxLength={300} placeholder="Address or agreed meeting point" /></label>
              <DestinationDistanceField bookingId={b.id} defaultValue={data.travel?.destination} />
              </div></section><section className="booking-travel-section"><div className="booking-travel-section-heading"><span>03</span><h3>Schedule & passengers</h3></div><div className="booking-travel-section-fields"><BookingTimePicker name="pickupTime" label="Pickup time" defaultValue={data.schedule?.pickupTime ?? data.travel?.pickupTime ?? "09:00"} /><BookingTimePicker name="dropoffTime" label="Drop-off time" defaultValue={data.schedule?.dropoffTime ?? data.travel?.dropoffTime ?? "09:00"} />
              <label className="booking-passenger-count">Passengers<input name="passengers" type="number" min={1} max={b.seats ?? 50} defaultValue={data.travel?.passengers ?? 1} required /></label>
            </div></section></div><aside className="booking-payment-breakdown"><h3>Rental breakdown</h3><p>{formatDate(b.start)} — {formatDate(b.end)}</p><dl>{routePricing?.status === "READY" ? <><div><dt>{routePricing.manual ? "Admin rental quotation" : "Reference rental rate"}</dt><dd>{money(routePricing.baseMinor ?? 0, b.currency)}</dd></div>{!routePricing.manual && <div><dt>Distance charge ({routePricing.billedKm?.toFixed(1)} km)</dt><dd>{money(routePricing.distanceMinor ?? 0, b.currency)}</dd></div>}</> : <div><dt className="booking-daily-rate-label"><span>{days} {days === 1 ? "day" : "days"}</span><small>{money(b.daily, b.currency)} per day</small></dt><dd>{money(days * b.daily, b.currency)}</dd></div>}{b.fee > 0 && <div><dt>Existing booking fees</dt><dd>{money(b.fee, b.currency)}</dd></div>}<div><dt>Security Deposit</dt><dd>{money(b.deposit, b.currency)}</dd></div><div className="booking-breakdown-total"><dt>{routePricing?.status === "QUOTATION_REQUIRED" ? "Provisional total" : "Total"}</dt><dd>{money(b.total, b.currency)}</dd></div></dl><div className="booking-reservation-payment-summary"><span>50% reservation payment</span><strong>{routePricing?.status === "QUOTATION_REQUIRED" ? "After quotation" : money(reservationPayment, b.currency)}</strong><small>Non-refundable · Remaining balance paid directly to TrustRide</small></div><small>{data.service === "WITH_DRIVER" ? "Driver arrangements and any additional service charges are subject to confirmation by TrustRide." : "Your request is subject to review and confirmation."}</small></aside></div>}
            {step === 2 && (requirements ? <SelfDriveUploads bookingId={b.id} data={data} onSaved={setData} onBusy={setDocumentSaving} onError={setErrorMessage} /> : <div className="booking-driver-request"><div className={`booking-document-upload${hasRequiredDriverId(data) ? " document-accepted" : ""}`}><label className="booking-government-id-type">Valid ID type<select name="driverIdType" defaultValue={data.driverIdType ?? ""} required><option value="" disabled>Select your valid ID</option>{driverIdTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label><label className="booking-document-title" htmlFor="document-driverValidId"><strong>Upload valid ID</strong>{!data.documents?.driverValidId && <span className="required-star" aria-hidden="true">*</span>}</label><span>One valid government-issued ID is required. JPEG or PNG, up to 5 MB.</span><div className="booking-upload-control">{data.documents?.driverValidId && <div className="booking-upload-saved"><Check size={14} /><span>{data.documents.driverValidId.name}</span><DocumentPreview src={`/api/bookings/${b.id}/documents/driverValidId`} name={data.documents.driverValidId.name} pdf={data.documents.driverValidId.path.endsWith(".pdf")} label="View submitted ID" /></div>}<DocumentUpload id="document-driverValidId" name="driverValidId" required={!data.documents?.driverValidId} /></div></div><div className="booking-driver-travel-fields"><label>Meetup time<input type="time" name="meetupTime" defaultValue={data.driverRequest?.meetupTime ?? data.travel?.pickupTime ?? "09:00"} required /><small>Meetup on {formatDate(b.start)} · Asia/Manila time</small></label><label>Additional requests (optional)<textarea name="requestNotes" maxLength={2000} defaultValue={data.driverRequest?.notes} placeholder="Tell us about your meeting point, luggage, or other travel requests." /></label><p>You can return to this step and update your request while the booking is awaiting review.</p></div></div>)}
            </fieldset>
            {step === 2 && <RequirementsPrivacyConsent storageKey={`trustride:privacy:v1:${b.id}:${data.service}`} onConsentChange={setPrivacyChecked} key={data.service} ready={Boolean(hasRequiredDriverId(data) && hasSelfDriveLicenseMatch(data) && (requirements ? data.documents?.license && data.documents?.ltms && data.documents?.governmentId1 && data.documents?.billing && data.governmentIdType : data.documents?.driverValidId))} accepted={Boolean(data.privacyConsent && data.privacyConsent.service === data.service)} />}
            <div className="booking-step-actions">{step > 0 && <button type="button" className="booking-secondary-button" disabled={pending} onClick={() => setStep(step - 1)}><ArrowLeft size={15} />Back</button>}{editable ? <button type="submit" disabled={pending || documentSaving || (step === 2 && !privacyChecked)}>{documentSaving ? "Checking and saving..." : pending ? (step === 2 && requirements ? "Checking documents..." : "Saving…") : step === 2 ? "Submit requirements" : "Save & continue"}{!pending && <ArrowRight size={15} />}</button> : <button type="button" disabled={step === 2 && !privacyChecked} onClick={() => setStep(Math.min(3, step + 1))}>Next <ArrowRight size={15} /></button>}</div>
          </form> : <>
            <div className="booking-payment-status"><div><span>BOOKING AMOUNT</span><h3>{routePricing?.status === "QUOTATION_REQUIRED" ? "Quotation required" : money(b.total, b.currency)}</h3><p>Approved payments: {money(b.paid, b.currency)} · Remaining balance: {money(Math.max(0, b.total - b.paid), b.currency)}</p></div><span className="booking-payment-badge">{b.paid >= b.total ? "Paid" : paymentProof?.status === "PENDING" ? "Receipt under review" : b.paid > 0 ? "Partially paid" : "Awaiting payment"}</span></div>
            {paymentProof && <div className="booking-proof-summary"><strong>Payment proof: {paymentProof.status.toLowerCase()}</strong><p>{money(paymentProof.amountMinor, b.currency)} · {paymentProof.method === "GCASH" ? "GCash" : "Bank transfer"} · Reference {paymentProof.reference}</p>{paymentProof.reviewNote && <p>{paymentProof.reviewNote}</p>}<a href={`/api/bookings/${b.id}/documents/paymentProof`} target="_blank" rel="noreferrer">View submitted receipt ↗</a>{paymentProof.status === "PENDING" && <small>Your receipt is awaiting admin review. Your paid balance will update after approval.</small>}</div>}
            {["PENDING", "CONFIRMED", "DELIVERED"].includes(b.status) && b.paid === 0 && reservationPayment > 0 && routePricing?.status !== "QUOTATION_REQUIRED" && paymentProof?.status !== "PENDING" && <form action={submit} className="booking-payment-proof-form booking-qr-form">
              <input type="hidden" name="bookingId" value={b.id} /><input type="hidden" name="step" value="payment" />
              <div className="booking-transfer-heading"><span>TRANSFER & VERIFY</span><h3>Secure your booking with 50%</h3><p>Transfer exactly {money(reservationPayment, b.currency)}, then upload the money-transfer receipt. This reservation payment is non-refundable. Arrange the remaining 50% directly with TrustRide.</p></div>
              <div className="booking-transfer-layout">
                <aside className="booking-transfer-qr">
                  <div className="booking-qr-method"><span className={paymentMethod === "GCASH" ? "gcash" : "bank"}>{paymentMethod === "GCASH" ? "GCash" : "Bank transfer"}</span><small>SCAN TO PAY</small></div>
                  <div className="booking-qr-image"><Image key={paymentMethod} src={paymentMethod === "GCASH" ? gcashQr : bankQr} alt={paymentMethod === "GCASH" ? "TrustRide GCash payment QR code" : "TrustRide bank transfer payment QR code"} sizes="(max-width: 760px) 80vw, 330px" /></div>
                  <div className="booking-qr-balance"><span>50% reservation payment · Non-refundable</span><strong>{money(reservationPayment, b.currency)}</strong></div>
                  <p>Check the recipient and amount in your payment app before confirming the transfer.</p>
                </aside>
                <div className="booking-transfer-fields">
                  <label><span className="required-field-label">Payment method</span><select name="paymentMethod" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} required><option value="GCASH">GCash</option><option value="BANK_TRANSFER">Bank transfer</option></select></label>
                  <ReceiptPaymentFields bookingId={b.id} currency={b.currency} pending={pending} />
                </div>
              </div>
            </form>}
            {b.paid > 0 && <p className="booking-step-notice">Your reservation payment is recorded. Please arrange the remaining balance directly with TrustRide.</p>}
            <div className="booking-step-actions"><button type="button" className="booking-secondary-button" onClick={() => setStep(2)}><ArrowLeft size={15} />Back to requirements</button><Link className="button" href="/bookings">View my reservations</Link></div>
            {["PENDING", "CONFIRMED"].includes(b.status) && <ReservationCancellation bookingId={b.id} requested={b.cancellationRequested} />}
          </>}
        </div>
        <div className="booking-details-bottom"><span>TrustRide Car Rental Services</span><span>Your progress is saved when you continue.</span></div>
      </div>
    </div>
  );
}



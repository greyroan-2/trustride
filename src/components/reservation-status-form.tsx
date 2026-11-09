"use client";
import { bookingStatusTransitions } from "@/lib/booking-status";
import { useState } from "react";
import { adminMutation } from "@/app/actions/admin";
import { SubmitButton } from "./submit-button";

export function ReservationStatusForm({ id, status }: { id: string; status: string }) {
  const options = bookingStatusTransitions[status] ?? [];
  const [decision, setDecision] = useState(options[0]);
  if (!options.length) return null;
  return <form action={adminMutation} className="form">
    <input type="hidden" name="action" value="booking" /><input type="hidden" name="id" value={id} />
    <label>Change status<select name="status" value={decision} onChange={event => setDecision(event.target.value)}>{options.map(value => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label>
    {decision === "CONFIRMED" && <p className="request-muted">Confirming immediately reserves these dates and blocks other bookings, even if payment is incomplete.</p>}
    {decision === "DELIVERED" && <p className="request-muted">The unit is with the client. Confirmed reservations also change to Delivered automatically at pickup time, regardless of payment.</p>}
    {decision === "COMPLETED" && <label className="booking-completion-approval"><input type="checkbox" name="completionApproved" value="yes" required />I confirm that the unit has been returned and approve completing this rental.</label>}
    {decision === "REJECTED" && <label>Reason for rejection<textarea name="rejectionReason" required maxLength={500} rows={4} placeholder="Explain why this reservation request is being rejected." /><small>This reason will be shown to the customer.</small></label>}
    <SubmitButton>Update reservation</SubmitButton>
  </form>;
}


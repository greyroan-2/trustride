import { adminMutation } from "@/app/actions/admin";
import { SubmitButton } from "./submit-button";
import { money } from "@/lib/validation";

export function AdminReservationQuote({ bookingId, feeMinor, depositMinor, baseMinor }: { bookingId: string; feeMinor: number; depositMinor: number; baseMinor?: number }) {
  return <section className="request-info-section"><h3>Rental quotation</h3><p className="request-muted">Set a quote for longer trips, provincial destinations, or routes that cannot be priced automatically. The online reservation payment is 50% of the final total and is non-refundable.</p><form action={adminMutation} className="form"><input type="hidden" name="action" value="booking-quote" /><input type="hidden" name="id" value={bookingId} /><label>Rental charge (PHP)<input name="rentalAmount" type="number" min="0" step="0.01" required defaultValue={baseMinor === undefined ? "" : (baseMinor / 100).toFixed(2)} /></label><label>Additional fee (PHP)<input name="additionalFee" type="number" min="0" step="0.01" required defaultValue={(feeMinor / 100).toFixed(2)} /><small>Enter 0 for no additional fee.</small></label><p className="request-muted">The security deposit of {money(depositMinor)} is added to the rental charge and additional fee.</p><SubmitButton>Save quotation</SubmitButton></form></section>;
}

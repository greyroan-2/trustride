"use client";

import { useState } from "react";
import { CalendarDays, ShieldCheck, ReceiptText } from "lucide-react";
import { adminMutation } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { money, pesoAmount } from "@/lib/validation";
import { distancePricingConfig, supportsDriverDistancePricing } from "@/lib/distance-pricing";

type Pricing = { dailyMinor: number; feeMinor: number; depositMinor: number; distancePricing?: unknown };
export function AdminPricingCard({ vehicleId, name, pricing }: { vehicleId: string; name: string; unitCode: string; pricing: Pricing | null }) {
  const [distance, setDistance] = useState(() => distancePricingConfig(pricing?.distancePricing));
  const [values, setValues] = useState({
    dailyRate: pricing ? (pricing.dailyMinor / 100).toFixed(2) : "",
    deposit: ((pricing?.depositMinor ?? 0) / 100).toFixed(2),
    additionalFee: ((pricing?.feeMinor ?? 0) / 100).toFixed(2),
  });
  const fields = [
    { name: "dailyRate" as const, label: "Daily rental rate", hint: "Charged for each rental day", icon: CalendarDays },
    { name: "additionalFee" as const, label: "Additional fee", hint: "Optional one-time charge. Enter 0 for no additional fee.", icon: ReceiptText },
    { name: "deposit" as const, label: "Security Deposit", hint: "Included in the estimated total", icon: ShieldCheck },
  ];
  const amounts = fields.map(field => pesoAmount.safeParse(values[field.name]));
  const total = amounts.every(amount => amount.success) ? amounts.reduce((sum, amount) => sum + (amount.success ? amount.data : 0), 0) : null;
  return (
    <form action={adminMutation} className="panel pricing-card">
      <input type="hidden" name="action" value="pricing" />
      <input type="hidden" name="id" value={vehicleId} />
      <input type="hidden" name="currency" value="PHP" />
      <div className="pricing-card-heading"><div><h2>{name}</h2><p>Rental rates · Philippine peso (PHP)</p></div><span className={`pricing-status${pricing ? " configured" : ""}`}>{pricing ? "Pricing configured" : "Set up pricing"}</span></div>
      <div className="pricing-fields">
        {fields.map(({ name: field, label, hint, icon: Icon }) => (
          <label key={field} htmlFor={`${vehicleId}-${field}`}>
            <span className="pricing-field-label"><Icon size={15} />{label}</span>
            <span className="pricing-currency-input"><span aria-hidden="true">₱</span><input id={`${vehicleId}-${field}`} name={field} type="text" inputMode="decimal" pattern="[0-9]{1,7}([.][0-9]{1,2})?" maxLength={10} required value={values[field]} placeholder="0.00" aria-describedby={`${vehicleId}-${field}-hint`} onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} onBlur={event => { const amount = pesoAmount.safeParse(event.target.value); if (amount.success) setValues(current => ({ ...current, [field]: (amount.data / 100).toFixed(2) })); event.target.setCustomValidity(amount.success ? "" : "Enter an amount between ₱0.00 and ₱1,000,000.00, with up to two decimal places."); }} onInput={event => event.currentTarget.setCustomValidity("")} /></span>
            <small id={`${vehicleId}-${field}-hint`}>{hint}</small>
          </label>
        ))}
      </div>
      {supportsDriverDistancePricing(name) && <fieldset className="pricing-distance-settings"><legend className="sr-only">With-driver distance pricing</legend>
        <div className="pricing-distance-heading"><h3>With-driver distance pricing</h3><p>Set how route distance contributes to the rental price.</p></div>
        <label className="pricing-distance-enable"><span><strong>Mapbox route pricing</strong><small>{distance.enabled ? "Enabled for new with-driver requests" : "Turn on to calculate prices from driving distance"}</small></span><input type="checkbox" role="switch" name="distancePricingEnabled" checked={distance.enabled} onChange={event => setDistance(current => ({ ...current, enabled: event.target.checked }))} /></label>
        <label>Rate per kilometer<span className="pricing-distance-money"><span aria-hidden="true">₱</span><input aria-label="Price per kilometer in Philippine pesos" name="perKmRate" type="number" min={distance.enabled ? "0.01" : "0"} step="0.01" required defaultValue={(distance.perKmMinor / 100).toFixed(2)} /><span>/ km</span></span></label>
        <label>Distance charged<select name="roundTrip" defaultValue={distance.roundTrip ? "yes" : "no"}><option value="no">One-way</option><option value="yes">Round-trip (2 × one-way)</option></select></label>
        <label className="pricing-distance-wide">Base pickup address<input name="originAddress" maxLength={300} required={distance.enabled} defaultValue={distance.originAddress} placeholder="Street, barangay, Dasmariñas City, Cavite" /><small>The starting point used for route calculations.</small></label>
        <label className="pricing-distance-wide">Price calculation<select name="distancePricingMode" defaultValue={name.toLowerCase().includes("innova") ? distance.mode : "DISTANCE_ONLY"}><option value="DISTANCE_ONLY">Distance charge + fees</option>{name.toLowerCase().includes("innova") && <option value="ADD_TO_REFERENCE">Reference rental rate + distance charge + fees</option>}</select><small>Fees include the additional fee and security deposit entered above.</small></label>
        <p className="pricing-distance-note">Trips over 24 hours and long-distance destinations require a quotation. Self-drive rentals keep the daily rate.</p>
      </fieldset>}
      <div className="pricing-card-footer"><div><span>Example · 1-day rental including fees and security deposit</span><strong>{total === null ? "Enter a daily rate" : money(total)}</strong></div><SubmitButton>Save pricing</SubmitButton></div>
    </form>
  );
}

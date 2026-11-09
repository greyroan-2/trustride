"use client";

import { useState } from "react";
import { AdminPricingCard } from "@/components/admin-pricing-card";
import { InnovaPricingReference } from "./innova-pricing-reference";

type PricingVehicle = {
  id: string; name: string; unitCode: string; image: string; revision: string;
  pricing: { dailyMinor: number; feeMinor: number; depositMinor: number; distancePricing?: unknown } | null;
};
export function AdminPricingWorkspace({ vehicles, initialVehicleId }: { vehicles: PricingVehicle[]; initialVehicleId?: string }) {
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? vehicles[0]?.id ?? "");
  const vehicle = vehicles.find(item => item.id === vehicleId) ?? vehicles[0];
  if (!vehicle) return <div className="notice">Add a vehicle to configure its rental rates.</div>;
  return (
    <section className="pricing-single-workspace">
      <div className="pricing-selection-bar"><div><h2>Vehicle pricing</h2><p>Select a vehicle to review and update its rental rates.</p></div><label>Vehicle<select value={vehicle.id} onChange={event => setVehicleId(event.target.value)}>{vehicles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <div className="pricing-single-layout">
        <div className="pricing-sidebar">
        <aside className="pricing-vehicle-preview"><div className="pricing-preview-photo" role="img" aria-label={vehicle.name} style={{ backgroundImage: `url(${vehicle.image})` }} /><div className="pricing-preview-description"><span>SELECTED VEHICLE</span><h2>{vehicle.name}</h2><p>Set the rental rate, optional additional fee, and security deposit for this vehicle.</p><div className="pricing-preview-note">Updated rates apply to new reservation requests. Existing reservations keep their original totals.</div></div></aside>
        {vehicle.name.toLowerCase().includes("innova") && <InnovaPricingReference />}
        </div>
        <AdminPricingCard key={`${vehicle.id}-${vehicle.revision}`} vehicleId={vehicle.id} name={vehicle.name} unitCode={vehicle.unitCode} pricing={vehicle.pricing} />
      </div>
    </section>
  );
}

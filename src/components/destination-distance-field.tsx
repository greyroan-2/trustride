"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Route, LoaderCircle } from "lucide-react";
import { money } from "@/lib/validation";

type Estimate = { origin: string; destination: string; distanceKm: number; durationMinutes: number; currency: string; quote?: { status: string; reason?: string; totalMinor?: number } };
export function DestinationDistanceField({ bookingId, defaultValue = "" }: { bookingId: string; defaultValue?: string }) {
  const [destination, setDestination] = useState(defaultValue);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [contextRevision, setContextRevision] = useState(0);
  const job = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const field = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { job.current++; controller.current?.abort(); }, []);
  const calculate = useCallback(async (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    const current = ++job.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setEstimate(null); setError(""); setErrorCode("");
    if (value.trim().length < 3) { setError("Enter a more specific destination first."); return; }
    setBusy(true);
    try {
      const form = field.current?.closest("form");
      const fields = form ? new FormData(form) : null;
      const response = await fetch("/api/travel-distance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, destination: value.trim(), pickupLocation: fields?.get("pickupLocation") ?? "", pickupTime: fields?.get("pickupTime"), dropoffTime: fields?.get("dropoffTime") }), signal: controller.current.signal });
      const data = await response.json();
      if (job.current !== current) return;
      if (!response.ok) { setError(data.error ?? "Could not calculate the route."); setErrorCode(data.code ?? "ROUTE_UNAVAILABLE"); } else setEstimate(data);
    } catch { if (job.current === current) setError("Could not calculate the route. Please try again."); }
    finally { if (job.current === current) setBusy(false); }
  }, [bookingId]);
  useEffect(() => {
    const form = field.current?.closest("form");
    if (!form) return;
    const onContextInput = (event: Event) => {
      const target = event.target;
      if ((target instanceof HTMLInputElement && target.name === "pickupLocation") || (target instanceof HTMLSelectElement && target.closest(".booking-time-field"))) {
        job.current++; controller.current?.abort(); setEstimate(null); setError(""); setErrorCode(""); setBusy(false); setContextRevision(current => current + 1);
      }
    };
    form.addEventListener("input", onContextInput);
    return () => form.removeEventListener("input", onContextInput);
  }, []);
  useEffect(() => {
    const scheduled = destination.trim().length >= 3 ? setTimeout(() => { void calculate(destination); }, 1000) : null;
    timer.current = scheduled;
    return () => { if (scheduled) clearTimeout(scheduled); };
  }, [destination, calculate, contextRevision]);
  return <div ref={field} className="destination-distance-field"><label>Destination<input name="destination" value={destination} required maxLength={300} placeholder="Enter the destination address or city" onChange={event => { job.current++; controller.current?.abort(); setDestination(event.target.value); setEstimate(null); setError(""); setErrorCode(""); setBusy(false); }} /></label>
    <div className="destination-route-actions"><button type="button" className="destination-route-button" onClick={() => { void calculate(destination); }} disabled={busy || destination.trim().length < 3}>{busy ? <LoaderCircle size={15} className="receipt-scan-spinner" /> : <Route size={15} />}{busy ? "Calculating…" : "Calculate driving distance"}</button><div className="destination-live-distance" aria-live="polite" aria-atomic="true" data-ready={Boolean(estimate)}><span>One-way distance</span><strong>{busy ? "Calculating…" : estimate ? `${estimate.distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km` : error ? errorCode === "ORIGIN_REQUIRED" ? "Pickup needed" : errorCode === "RATE_LIMITED" ? "Please wait" : "Check route" : "— km"}</strong></div></div>
    {error && <p className="destination-distance-error" role="status">{error}</p>}
    {estimate && <div className="destination-distance-result" role="status"><MapPin size={17} aria-hidden="true" /><div><strong>{estimate.distanceKm.toLocaleString()} km one way · About {estimate.durationMinutes} minutes</strong><p>{estimate.origin} → {estimate.destination}</p>{estimate.quote?.status === "READY" && estimate.quote.totalMinor !== undefined && <p>Estimated total: {money(estimate.quote.totalMinor, estimate.currency)}. The route and price are checked again when you save.</p>}{estimate.quote?.status === "QUOTATION_REQUIRED" && <p>{estimate.quote.reason}</p>}<small>Check that the matched destination is correct.</small></div></div>}
  </div>;
}

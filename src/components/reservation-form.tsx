"use client";
import { useRef, useState } from "react";
import { SubmitButton } from "./submit-button";
import { BookingTimePicker } from "./booking-time-picker";
import { calculatePrice } from "@/lib/validation";
import { reserve } from "@/app/actions/booking";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function ReservationForm({
  vehicleId,
  pricing,
  blocked,
  initialStart = "",
  initialEnd = "",
}: {
  vehicleId: string;
  pricing: {
    dailyMinor: number;
    feeMinor: number;
    depositMinor: number;
    currency: string;
  } | null;
  blocked: { start: string; end: string; reason: string }[];
  initialStart?: string;
  initialEnd?: string;
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [selectionError, setSelectionError] = useState("");
  const [editingDate, setEditingDate] = useState<"start" | "end" | null>(null);
  const pickerRef = useRef<HTMLElement>(null);
  function editDate(field: "start" | "end") {
    setEditingDate(field);
    setSelectionError("");
    const current = field === "start" ? start : end || start;
    if (current) setMonth(current.slice(0, 7));
    pickerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    pickerRef.current?.focus({ preventScroll: true });
  }
  const [month, setMonth] = useState(() =>
    initialStart.slice(0, 7) || new Date().toISOString().slice(0, 7),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const conflict = blocked.some((b) => start < b.end && end > b.start);
  let quote = null;
  try {
    if (pricing)
      quote = calculatePrice(
        start,
        end,
        pricing.dailyMinor,
        pricing.feeMinor,
        pricing.depositMinor,
      );
  } catch {}
  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const firstDay = new Date(`${month}-01T00:00:00Z`);
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(firstDay);
  function moveMonth(amount: number) {
    setMonth(new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + amount, 1)).toISOString().slice(0, 7));
  }
  return (
    <form action={reserve} className="form client-reservation-form">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <h3>Make room for your next journey.</h3>
      <section ref={pickerRef} tabIndex={-1} className="booking-date-picker" aria-label="Choose rental dates">
      <div className="booking-calendar-header"><div><span>CHOOSE YOUR DATES</span><h4 aria-live="polite">{monthLabel}</h4></div><div><button type="button" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button></div></div>
      <p className="booking-calendar-instruction">{editingDate === "start" ? "Choose a new pickup date." : editingDate === "end" ? "Choose a return date." : "Select your pickup date, then your return date."}</p>
      <div className="booking-calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span className="booking-weekday" key={day}>{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, "0")}`;
          const block = blocked.find((b) => d >= b.start && d < b.end);
          return (
            <button
              type="button"
              key={d}
              title={block?.reason ?? (d < today ? "Past date" : "Select date")}
              aria-label={`${d}${block ? `, ${block.reason}` : ""}`}
              aria-pressed={d === start || d === end || (!!start && !!end && d > start && d < end)}
              disabled={!!block || d < today}
              className={d === start || d === end ? "booking-endpoint" : start && end && d > start && d < end ? "booking-in-range" : d === today ? "booking-today" : ""}
              onClick={() => {
                if (editingDate === "start") { setStart(d); setEnd(""); setEditingDate("end"); setSelectionError(""); return; }
                if (editingDate === "end" && !start) { setSelectionError("Choose a pickup date first."); return; }
                if (editingDate === "end" && start) {
                  if (d < start) { setSelectionError("Return date cannot be before the pickup date."); return; }
                  setEnd(d === start ? new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10) : d); setEditingDate(null); setSelectionError(""); return;
                }
                if (start && !end && d < start) { setSelectionError("Return date cannot be before the pickup date."); return; }
                setSelectionError("");
                if (!start || end) {
                  setStart(d);
                  setEnd("");
                } else setEnd(d === start ? new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10) : d);
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="booking-calendar-key"><span><i />Available</span><span><i />Selected</span><span><i />Unavailable</span></div>
      <div className="booking-calendar-selection" aria-live="polite"><span>{start ? `${start}${end ? ` → ${end}` : " → Select return date"}` : "No dates selected"}</span>{start && <button type="button" onClick={() => { setStart(""); setEnd(""); setEditingDate(null); setSelectionError(""); }}>Clear</button>}</div>
      <p className="booking-calendar-footnote">Return date is excluded from rental days.</p>
      {selectionError && <p className="booking-date-error" role="alert">{selectionError}</p>}
      </section>
      <input type="hidden" name="start" value={start} />
      <input type="hidden" name="end" value={end} />
      <div className="booking-date-summary">
        {[{ field: "start" as const, label: "Pickup date", value: start }, { field: "end" as const, label: "Return date", value: end }].map(({ field, label, value }) => <button type="button" key={field} className={editingDate === field ? "editing" : ""} onClick={() => editDate(field)}><span>{label}</span><strong>{value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "Choose a date"}</strong><small>{value ? "Change date" : "Select on calendar"}</small></button>)}
      </div>
      <div className="booking-time-fields"><BookingTimePicker name="pickupTime" label="Pickup time" /><BookingTimePicker name="dropoffTime" label="Drop-off time" /></div>
      {conflict && (
        <p role="alert">These dates include an unavailable period.</p>
      )}
      <input type="hidden" name="notes" value="" />
      <label className="booking-confirmation">
          <input type="checkbox" required /><span>I have reviewed the selected dates and times. This request requires admin approval.</span>
      </label>
      <SubmitButton disabled={!pricing || !quote || conflict}>
        Reserve This Ride
      </SubmitButton>
      {!pricing && (
        <p className="notice">
          Reservations are unavailable until the business configures verified
          rental rates.
        </p>
      )}
    </form>
  );
}

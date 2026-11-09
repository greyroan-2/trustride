"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { reservationCalendarLabel } from "@/lib/reservation-payment";
import { DATE_TRANSACTIONS_MESSAGE, transactionsOnDates } from "@/lib/calendar-transactions";
import { CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { adminMutation } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";

type Period = { id: string; vehicleId: string; start: string; end: string; status: string; fullyPaid?: boolean };
type Vehicle = { id: string; name: string; unitCode: string; status: string };
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
export function AdminReservationCalendar({ month, today, vehicles, periods }: { month: string; today: string; vehicles: Vehicle[]; periods: Period[] }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterId = useId();
  useEffect(() => {
    if (!filtersOpen) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !filterRef.current?.contains(event.target)) setFiltersOpen(false);
    }
    function closeEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        filterRef.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [filtersOpen]);
  const [selected, setSelected] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [inspectedDate, setInspectedDate] = useState("");
  const selectModeButton = useRef<HTMLButtonElement>(null);
  function selectDate(date: string) {
    if (!selectionMode) { setInspectedDate(date); return; }
    if (selected && date < selected) {
      setRangeError("End date cannot be before the start date. Clear the selection to choose an earlier start.");
      return;
    }
    setRangeError("");
    if (!selected || selectedEnd) { setSelected(date); setSelectedEnd(""); }
    else setSelectedEnd(date);
  }
  function clearSelection() { setSelected(""); setSelectedEnd(""); setRangeError(""); }
  function closeSelection() { setSelectionMode(false); clearSelection(); selectModeButton.current?.focus(); }
  const [view, setView] = useState<"month" | "week">("month");
  const [visibleStatuses, setVisibleStatuses] = useState(["CONFIRMED", "DELIVERED", "PENDING", "BLOCKED"]);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const first = new Date(`${month}-01T00:00:00Z`);
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells = Math.ceil((offset + days) / 7) * 7;
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const previous = dateKey(new Date(Date.UTC(year, monthIndex - 1, 1))).slice(0, 7);
  const next = dateKey(new Date(Date.UTC(year, monthIndex + 1, 1))).slice(0, 7);
  const effectiveEnd = selectedEnd && selectedEnd === selected ? dateKey(new Date(Date.parse(selected) + 86400000)) : selectedEnd;
  const transactionEnd = effectiveEnd || (selected ? dateKey(new Date(Date.parse(selected) + 86400000)) : "");
  const transactionConflicts = transactionsOnDates(periods, selected, transactionEnd);
  const conflict = !!effectiveEnd && periods.some(period => period.vehicleId === vehicleId && period.status !== "PENDING" && selected < period.end && effectiveEnd > period.start);
  const formatRangeDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  const duration = selected && effectiveEnd ? Math.round((Date.parse(effectiveEnd) - Date.parse(selected)) / 86400000) : 0;
  const rangeText = !selected ? "Select a start date, then an end date." : !selectedEnd ? `${formatRangeDate(selected)} → Choose an end date` : `${formatRangeDate(selected)} → ${formatRangeDate(selectedEnd)} · ${duration} ${duration === 1 ? "day" : "days"}`;
  const selectedVehicle = vehicles.find(vehicle => vehicle.id === vehicleId);
  const selectedBlocks = periods.filter(period => period.vehicleId === vehicleId && period.status === "BLOCKED" && selected >= period.start && selected < period.end);
  const focusDate = selectionMode && selected.startsWith(month) ? selected : inspectedDate.startsWith(month) ? inspectedDate : today.startsWith(month) ? today : `${month}-01`;
  const weekIndex = Math.floor((Number(focusDate.slice(-2)) - 1 + offset) / 7);
  const focusPeriods = periods.filter(period => focusDate >= period.start && focusDate < period.end);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <section className="reservation-calendar-workspace" onKeyDown={event => { if (event.key === "Escape" && selectionMode) { event.preventDefault(); closeSelection(); } }}>
      <div className="reservation-planner-layout">
      <aside className="reservation-planner-sidebar">
        <div className="planner-mini-calendar">
          <div className="planner-mini-heading"><strong>{monthLabel}</strong><Link href={`/admin/bookings?month=${previous}`} aria-label="Previous month"><ChevronLeft size={15} /></Link><Link href={`/admin/bookings?month=${next}`} aria-label="Next month"><ChevronRight size={15} /></Link></div>
          <div className="planner-mini-grid">{weekdays.map(day => <span key={day}>{day[0]}</span>)}{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => {
            const date = `${month}-${String(index + 1).padStart(2, "0")}`;
            const endpoint = selectionMode && (date === selected || date === selectedEnd);
            const withinRange = selectionMode && !!selected && !!selectedEnd && date > selected && date < selectedEnd;
            return <button type="button" key={date} className={endpoint ? "chosen range-endpoint" : withinRange ? "within-range" : !selectionMode && date === focusDate ? "chosen" : ""} aria-label={`${selectionMode ? "Select" : "View status for"} ${date}${endpoint ? ", range endpoint" : withinRange ? ", in selected range" : ""}`} aria-pressed={selectionMode ? endpoint || withinRange : date === focusDate} onClick={() => selectDate(date)}>{index + 1}</button>;
          })}</div>
        </div>
        {!selectionMode && <section className="planner-date-details" aria-label="Date status details" aria-live="polite">
        <div className="planner-date-details-heading"><h3>{formatRangeDate(focusDate)}</h3><span>{focusPeriods.length} {focusPeriods.length === 1 ? "entry" : "entries"}</span></div>
        {focusPeriods.length === 0 ? <p>No reservations or disabled dates are recorded for this day.</p> : <div className="planner-date-detail-list">{focusPeriods.map(period => {
          const vehicle = vehicles.find(item => item.id === period.vehicleId);
          return <article className="planner-date-detail" key={period.id}>
            <span className={period.status === "DELIVERED" ? "delivered" : period.status === "CONFIRMED" ? "booked" : period.status === "PENDING" ? "pending" : "blocked"}>{reservationCalendarLabel(period.status, period.fullyPaid)}</span>
            <strong>{vehicle?.name ?? "Vehicle"}{vehicle?.unitCode ? " / " + vehicle.unitCode : ""}</strong>
            <p>{formatRangeDate(period.start)} to {formatRangeDate(period.end)}<small>Return date excluded</small></p>
            {period.status !== "BLOCKED" && <Link href={"/admin/requests?request=" + encodeURIComponent(period.id)}>View request details</Link>}
          </article>;
        })}</div>}
      </section>}
        {selectionMode && <section className="planner-date-actions">
          <h3>Date actions</h3>
          {rangeError && <p className="planner-range-error" role="alert">{rangeError}</p>}
          {transactionConflicts.length > 0 && <div className="planner-transaction-warning" role="alert"><strong>Dates cannot be disabled</strong><p>{DATE_TRANSACTIONS_MESSAGE}</p><ul>{transactionConflicts.map(period => <li key={period.id}><Link href={`/admin/requests?request=${encodeURIComponent(period.id)}`}>{vehicles.find(vehicle => vehicle.id === period.vehicleId)?.name ?? "Vehicle"} — {reservationCalendarLabel(period.status, period.fullyPaid)}</Link></li>)}</ul></div>}
          <label>Vehicle<select value={vehicleId} onChange={event => setVehicleId(event.target.value)}>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select></label>
          <form action={adminMutation}><input type="hidden" name="action" value="block" /><input type="hidden" name="vehicleId" value={vehicleId} /><input type="hidden" name="start" value={selected} /><input type="hidden" name="end" value={effectiveEnd} /><input type="hidden" name="reason" value="Dates disabled by administrator" /><input type="hidden" name="returnSection" value="bookings" /><input type="hidden" name="month" value={month} /><SubmitButton disabled={!selected || !selectedEnd || !!rangeError || selected < today || !vehicleId || conflict || transactionConflicts.length > 0}>Disable selected dates</SubmitButton></form>
          <form action={adminMutation}><input type="hidden" name="action" value="unblock-day" /><input type="hidden" name="vehicleId" value={vehicleId} /><input type="hidden" name="start" value={selected} /><input type="hidden" name="returnSection" value="bookings" /><input type="hidden" name="month" value={month} /><SubmitButton disabled={!selected || !selectedBlocks.length}>Remove disable</SubmitButton></form>
          <small>{selectedBlocks.length ? "Removes the block for this day only. Other blocked days stay unchanged." : conflict ? "This vehicle already has a confirmed booking on this day." : "Disabling applies to the selected vehicle."}</small>
        </section>}
      </aside>
      <div className="reservation-planner-main">
      <div className="reservation-calendar-heading"><div className="reservation-month-navigation"><h3 aria-live="polite">{monthLabel}</h3><Link href={`/admin/bookings?month=${previous}`} aria-label="Previous month"><ChevronLeft size={18} /></Link><Link href={`/admin/bookings?month=${next}`} aria-label="Next month"><ChevronRight size={18} /></Link></div><Link className="planner-today" href={`/admin/bookings?month=${today.slice(0, 7)}`} onClick={() => { clearSelection(); setInspectedDate(today); if (selectionMode) setSelected(today); }}>Today</Link><div className="planner-header-controls"><div className="planner-filter-dropdown" ref={filterRef}><button type="button" className="planner-filter-trigger" aria-label="Filter calendar" title="Filter calendar" aria-expanded={filtersOpen} aria-controls={filterId} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} />{visibleStatuses.length < 4 && <span className="planner-filter-dot" />}</button><fieldset id={filterId} className="planner-header-filters" data-open={filtersOpen} aria-hidden={!filtersOpen} inert={!filtersOpen}><legend className="sr-only">Calendar status filters</legend>{[["CONFIRMED", "Reserved / fully paid"], ["DELIVERED", "Delivered / with client"], ["PENDING", "Pending requests"], ["BLOCKED", "Disabled dates"]].map(([status, label]) => <label key={status}><input type="checkbox" checked={visibleStatuses.includes(status)} onChange={event => setVisibleStatuses(current => event.target.checked ? [...current, status] : current.filter(item => item !== status))} />{label}</label>)}</fieldset></div><button ref={selectModeButton} type="button" className="planner-select-mode" aria-pressed={selectionMode} onClick={() => { if (selectionMode) closeSelection(); else { clearSelection(); setSelectionMode(true); setFiltersOpen(false); } }}><CalendarDays size={16} aria-hidden="true" />Select Date</button><div className="planner-view-toggle"><button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>Week</button><button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>Month</button></div></div></div>
      <div className="reservation-calendar-legend"><span className="booked">Booked</span><span className="pending">Pending request</span><span className="blocked">Disabled</span><small>Asia/Manila · Return dates are excluded</small></div>
      <p className="planner-mode-hint" role="status">{selectionMode ? "Selection mode: choose a start date and an end date. Close to return to status details." : "Click a date to see its status details. Use Select Date to choose a range."}</p><div className="reservation-calendar-scroll"><div className="reservation-month-grid">
        {weekdays.map(day => <div className="reservation-weekday" key={day}>{day}</div>)}
        {Array.from({ length: cells }, (_, index) => {
          if (view === "week" && Math.floor(index / 7) !== weekIndex) return null;
          const day = index - offset + 1;
          if (day < 1 || day > days) return <div className="reservation-day outside" key={index}><span>{new Date(Date.UTC(year, monthIndex, day)).getUTCDate()}</span></div>;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const events = periods.filter(period => visibleStatuses.includes(period.status) && date >= period.start && date < period.end);
          return <div key={date} role="button" tabIndex={0} aria-label={`${selectionMode ? "Select" : "View status for"} ${date}, ${events.length} calendar entries`} aria-pressed={selectionMode ? !!selected && date >= selected && date <= (selectedEnd || selected) : date === focusDate} onClick={() => selectDate(date)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectDate(date); } }} className={`reservation-day${date === today ? " today" : ""}${selectionMode ? date >= selected && selected && date <= (selectedEnd || selected) ? " selected" : "" : date === focusDate ? " selected" : ""}`}>
            <span className="reservation-date-button">{day}</span>
            <div className="reservation-day-labels">{events.map(period => {
              const vehicle = vehicles.find(item => item.id === period.vehicleId);
              return <span key={period.id} className={`reservation-event ${period.status === "DELIVERED" ? "delivered" : period.status === "CONFIRMED" ? "booked" : period.status === "PENDING" ? "pending" : "blocked"}`}>{reservationCalendarLabel(period.status, period.fullyPaid)} - {vehicle?.name ?? "Vehicle"}</span>;
            })}</div>
          </div>;
        })}
      </div></div>
      {selectionMode && <div className="planner-booking-footer">
        <div aria-live="polite"><strong>{selectedVehicle?.name ?? "Select a vehicle"}</strong><span>{rangeText}</span>{rangeError && <span className="planner-range-error">{rangeError}</span>}{conflict && <span className="planner-range-error">The selected range overlaps booked or disabled dates.</span>}{selected && selected < today && <span className="planner-range-error">Choose a start date today or later.</span>}</div>
          <div className="planner-footer-actions">
            <button type="button" className="planner-clear-range" disabled={!selected} onClick={clearSelection}>Clear selection</button><button type="button" className="planner-close-selection" onClick={closeSelection}><X size={15} aria-hidden="true" />Close</button>
            {vehicleId && selectedVehicle?.status === "ACTIVE" && !conflict && selected >= today && selectedEnd && !rangeError ? <Link className="button" href={`/fleet/${vehicleId}?start=${selected}&end=${effectiveEnd}`}>Book this vehicle</Link> : <button type="button" disabled>Book this vehicle</button>}
          </div>
      </div>}
      </div></div>
    </section>
  );
}


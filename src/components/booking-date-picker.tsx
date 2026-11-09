"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
const iso = (date: Date) => date.toISOString().slice(0, 10);
const parse = (value: string) => new Date(`${value}T00:00:00Z`);
export function BookingDatePicker({ label, name, value, min, onChange }: { label: string; name: string; value: string; min: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || min).slice(0, 7));
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: globalThis.KeyboardEvent) { if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const first = parse(`${month}-01`);
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  function moveMonth(amount: number) { setMonth(iso(new Date(Date.UTC(year, monthIndex + amount, 1))).slice(0, 7)); }
  function choose(date: string) { onChange(date); setOpen(false); trigger.current?.focus(); }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = parse(date); next.setUTCDate(next.getUTCDate() + delta);
    const nextDate = iso(next);
    if (nextDate < min) return;
    setMonth(nextDate.slice(0, 7));
    requestAnimationFrame(() => wrapper.current?.querySelector<HTMLButtonElement>(`[data-day="${nextDate}"]`)?.focus());
  }
  return <div className="booking-date-field" ref={wrapper} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <span className="booking-date-label" id={`${id}-label`}><CalendarDays size={18} />{label}<span className="required-star" aria-hidden="true">*</span></span>
    <input type="hidden" name={name} value={value} />
    <button type="button" ref={trigger} className="booking-date-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => { if (!open) setMonth((value && value >= min ? value : min).slice(0, 7)); setOpen(!open); }}><span id={`${id}-value`}>{value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(parse(value)) : "Select date"}</span><CalendarDays size={17} /></button>
    {open && <div className="booking-date-popover" id={`${id}-calendar`} role="dialog" aria-labelledby={`${id}-label`}><div className="booking-date-month"><button type="button" aria-label="Previous month" disabled={month <= min.slice(0, 7)} onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button><strong aria-live="polite">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}</strong><button type="button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={17} /></button></div><div className="booking-date-weekdays" aria-hidden="true">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => <span key={day}>{day}</span>)}</div><div className="booking-date-days">{Array.from({ length: first.getUTCDay() }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: dayCount }, (_, index) => { const day = `${month}-${String(index + 1).padStart(2, "0")}`; return <button type="button" key={day} data-day={day} disabled={day < min} aria-label={new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "UTC" }).format(parse(day))} aria-pressed={value === day} aria-current={day === today ? "date" : undefined} onClick={() => choose(day)} onKeyDown={event => keyboard(event, day)}>{index + 1}</button>; })}</div><div className="booking-date-calendar-footer"><span>Asia/Manila</span><button type="button" disabled={today < min} onClick={() => choose(today)}>Today</button></div></div>}
  </div>;
}

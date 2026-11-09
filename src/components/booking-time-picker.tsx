"use client";
import { useId, useState } from "react";
import { Clock3 } from "lucide-react";

export function BookingTimePicker({ name, label, defaultValue = "09:00" }: { name: string; label: string; defaultValue?: string }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [hour, minute] = value.split(":");
  const hours = Number(hour);
  function update(hour12: number, minutes: string, period: string) {
    setValue(`${String(hour12 % 12 + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${minutes}`);
  }
  return <fieldset className="booking-time-field" aria-describedby={`${id}-zone`}>
    <legend>{label}</legend>
    <div className="booking-time-control">
      <Clock3 size={19} aria-hidden="true" />
      <select aria-label={`${label} hour`} value={String(hours % 12 || 12)} onChange={event => update(Number(event.target.value), minute, hours >= 12 ? "PM" : "AM")}>
        {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>)}
      </select>
      <span className="booking-time-colon" aria-hidden="true">:</span>
      <select aria-label={`${label} minute`} value={minute} onChange={event => update(hours % 12 || 12, event.target.value, hours >= 12 ? "PM" : "AM")}>
        {Array.from({ length: 60 }, (_, index) => <option key={index} value={String(index).padStart(2, "0")}>{String(index).padStart(2, "0")}</option>)}
      </select>
      <select className="booking-time-period" aria-label={`${label} AM or PM`} value={hours >= 12 ? "PM" : "AM"} onChange={event => update(hours % 12 || 12, minute, event.target.value)}><option value="AM">AM</option><option value="PM">PM</option></select>
    </div>
    <span className="booking-time-zone" id={`${id}-zone`}>Asia/Manila (UTC+8)</span>
    <input type="hidden" name={name} value={value} />
  </fieldset>;
}

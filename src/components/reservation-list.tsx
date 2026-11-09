"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { reservationHref } from "@/lib/reservation-navigation";
import { ArrowRight, CalendarDays, CarFront, Check, Clock3, X } from "lucide-react";
import styles from "./reservations.module.css";

type Reservation = {
  id: string; reference: string; status: string; name: string;
  category: string; image: string | null; start: string; end: string; total: string;
};
const statuses: Record<string, { label: string; description: string; tone: string }> = {
  PENDING: { label: "Pending", description: "Awaiting confirmation", tone: "pending" },
  CONFIRMED: { label: "Confirmed", description: "Your reservation is confirmed", tone: "confirmed" },
  DELIVERED: { label: "Delivered", description: "The unit is with you. Your rental is underway", tone: "delivered" },
  COMPLETED: { label: "Completed", description: "Thanks for riding with us", tone: "completed" },
  CANCELLED: { label: "Cancelled", description: "This reservation was cancelled", tone: "closed" },
  REJECTED: { label: "Rejected", description: "This request was not approved", tone: "rejected" },
};
const dateFormat = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const isActive = (booking: Reservation) => ["PENDING", "CONFIRMED", "DELIVERED"].includes(booking.status);

export function ReservationList({ bookings }: { bookings: Reservation[] }) {
  const [filter, setFilter] = useState("All reservations");
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = 0;
    const resize = () => {
      const cards = Array.from(list.children) as HTMLElement[];
      if (cards.length <= 4) {
        list.style.removeProperty("max-height");
        return;
      }
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const height = cards.slice(0, 4).reduce((total, card) => total + card.getBoundingClientRect().height, 0) + gap * 3;
      list.style.maxHeight = `${Math.ceil(height)}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(list);
    Array.from(list.children).slice(0, 4).forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [bookings, filter]);
  const active = bookings.filter(isActive).length;
  const filters = [
    { label: "All reservations", count: bookings.length },
    { label: "Active", count: active },
    { label: "Past & closed", count: bookings.length - active },
  ];
  const visible = bookings.filter((booking) => filter === "All reservations" || (filter === "Active" ? isActive(booking) : !isActive(booking)));
  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filter reservations">
          {filters.map(({ label, count }) => <button key={label} type="button" aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}<span>{count}</span></button>)}
        </div>
        <span className={styles.order}>Newest first</span>
      </div>
      <div ref={listRef} className={`${styles.list} ${visible.length > 4 ? styles.scrollable : ""}`} aria-live="polite" role="region" aria-label="Reservations" tabIndex={visible.length > 4 ? 0 : undefined}>
        {visible.length === 0 ? <div className={styles.empty}>
          <CarFront size={36} aria-hidden="true" />
          <h3>{bookings.length === 0 ? "Your next journey starts here" : "No reservations here yet"}</h3>
          <p>{bookings.length === 0 ? "Find your ride and make your first reservation." : "Try another filter to see your reservations."}</p>
          <Link href="/fleet">Explore the fleet <ArrowRight size={16} aria-hidden="true" /></Link>
        </div> : visible.map((booking) => {
          const status = statuses[booking.status] ?? { label: booking.status, description: "View your reservation for details", tone: "closed" };
          const StatusIcon = booking.status === "PENDING" ? Clock3 : ["CONFIRMED", "DELIVERED", "COMPLETED"].includes(booking.status) ? Check : X;
          return <Link className={styles.card} href={reservationHref(booking.id, booking.status)} key={booking.id}>
            <div className={styles.vehicleImage}>
              {booking.image ? <div role="img" aria-label={booking.name} style={{ backgroundImage: `url(${JSON.stringify(booking.image)})` }} /> : <CarFront size={52} strokeWidth={1} aria-hidden="true" />}
              <span>{booking.category}</span>
            </div>
            <div className={styles.details}>
              <div className={styles.cardTop}><span className={`${styles.status} ${styles[status.tone]}`}><StatusIcon size={13} aria-hidden="true" />{status.label}</span><span className={styles.reference}>{booking.reference}</span></div>
              <h3>{booking.name}</h3>
              <div className={styles.dates}><CalendarDays size={17} aria-hidden="true" /><span><time dateTime={booking.start.slice(0, 10)}>{dateFormat.format(new Date(booking.start))}</time><ArrowRight size={14} aria-label="to" /><time dateTime={booking.end.slice(0, 10)}>{dateFormat.format(new Date(booking.end))}</time></span></div>
              <p className={styles.statusHint}>{status.description}</p>
            </div>
            <div className={styles.price}><span>Reservation total</span><strong>{booking.total}</strong>{booking.status !== "REJECTED" && <span className={styles.view}>View reservation <ArrowRight size={16} aria-hidden="true" /></span>}</div>
          </Link>;
        })}
      </div>
    </div>
  );
}




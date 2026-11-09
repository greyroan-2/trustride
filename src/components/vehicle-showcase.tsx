"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Users, Gauge } from "lucide-react";
import styles from "./vehicle-showcase.module.css";

type Vehicle = { id: string; name: string; image: string; category: string; seats: number | null; transmission: string | null; features: string[]; price: string | null };
export function VehicleShowcase({ vehicles }: { vehicles: Vehicle[] }) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState("next");
  const [departing, setDeparting] = useState<Vehicle | null>(null);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moving = useRef(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => () => { if (animationTimer.current) clearTimeout(animationTimer.current); }, []);
  const vehicle = vehicles[active];
  if (!vehicle) return <p className="notice">No vehicles are currently available. Please check back soon.</p>;
  function change(index: number, movement: "next" | "previous" = index > active ? "next" : "previous") {
    const next = (index + vehicles.length) % vehicles.length;
    if (next === active || moving.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setDeparting(reduced ? null : vehicle);
    setDirection(movement);
    setActive(next);
    if (!reduced) {
      moving.current = true;
      animationTimer.current = setTimeout(() => { setDeparting(null); moving.current = false; }, 1100);
    }
  }
  return <div className={styles.showcase}>
    <div className={styles.stage} data-transitioning={Boolean(departing)}
      onTouchStart={event => {
        if (event.touches.length !== 1 || (event.target as HTMLElement).closest("button") || moving.current) { swipeStart.current = null; return; }
        swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }}
      onTouchMove={event => { if (event.touches.length !== 1) swipeStart.current = null; }}
      onTouchCancel={() => { swipeStart.current = null; }}
      onTouchEnd={event => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start || !event.changedTouches.length || vehicles.length < 2) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        change(active + (dx > 0 ? 1 : -1), dx > 0 ? "next" : "previous");
      }}>
      <span key={`name-${vehicle.id}`} className={styles.backdrop} aria-hidden="true">{vehicle.name}</span>
      {vehicles.length > 1 && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.sideCar} data-side="left" src={vehicles[(active - 1 + vehicles.length) % vehicles.length].image} alt="" aria-hidden="true"/>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.sideCar} data-side="right" src={vehicles[(active + 1) % vehicles.length].image} alt="" aria-hidden="true"/>
      </>}
      {departing && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={`departing-${departing.id}-${active}`} className={`${styles.car} ${styles.departing}`} data-direction={direction} src={departing.image} alt="" aria-hidden="true"/>
      </>}
      {/* Existing vehicle assets are retained for the moving vehicle presentation. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={`${vehicle.id}-${direction}`} className={styles.car} data-direction={direction} src={vehicle.image} alt={vehicle.name}/>
      <div className={styles.road} aria-hidden="true"/>
      {vehicles.length > 1 && <span className={styles.swipeHint}>Swipe to explore rides</span>}
      <div className={styles.navigation}><button type="button" aria-label="Previous vehicle" disabled={vehicles.length < 2} onClick={() => change(active - 1, "previous")}><ArrowLeft size={22}/></button><span>{String(active + 1).padStart(2, "0")} / {String(vehicles.length).padStart(2, "0")}</span><button type="button" aria-label="Next vehicle" disabled={vehicles.length < 2} onClick={() => change(active + 1, "next")}><ArrowRight size={22}/></button></div>
    </div>
    <div className={styles.details} aria-live="polite"><div><p className={styles.category}>{vehicle.category}</p><h2>{vehicle.name}</h2><div className={styles.specs}>{vehicle.seats && <span><Users size={17}/>{vehicle.seats} passengers</span>}{vehicle.transmission && <span><Gauge size={17}/>{vehicle.transmission}</span>}</div>{vehicle.features.length > 0 && <p className={styles.features}>{vehicle.features.join(" · ")}</p>}</div><div className={styles.action}>{vehicle.price ? <p><strong>{vehicle.price}</strong><span> / day · self-drive</span></p> : <p>Contact us for pricing</p>}<Link href={`/fleet/${vehicle.id}`} className={styles.request}>Request this Ride <ArrowRight size={18}/></Link><small>Choose your dates and rental type next.</small></div></div>
  </div>;
}

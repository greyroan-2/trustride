export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Wallet, ShieldCheck } from "lucide-react";
import { activeSessionUser } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { Viewer } from "@/components/viewer";
import { ReservationForm } from "@/components/reservation-form";
import { z } from "zod";
import { date } from "@/lib/validation";
import { reservationHref } from "@/lib/reservation-navigation";
import styles from "./existing-reservation.module.css";
export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ message?: string; start?: string; end?: string }>;
}) {
  const { vehicleId } = await params;
  const user = await activeSessionUser();
  if (!z.uuid().safeParse(vehicleId).success) {
    const unit = await db.vehicle.findFirst({
      where: { model: { slug: vehicleId }, archived: false, status: "ACTIVE" },
      select: { id: true },
    });
    if (unit) redirect(`/fleet/${unit.id}`);
    notFound();
  }
  const v = await db.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      model: true,
      media: true,
      pricing: true,
      blocks: true,
      bookings: {
        where: { status: { in: ["CONFIRMED", "DELIVERED"] } },
        select: { startDate: true, endDate: true },
      },
    },
  });
  if (!v || v.archived) notFound();
  if (!user && v.status !== "ACTIVE") notFound();
  const unfinished = user ? await db.booking.findFirst({ where: { customerId: user.id, vehicleId: v.id, status: { in: ["PENDING", "CONFIRMED", "DELIVERED"] } }, select: { id: true, reference: true, status: true, startDate: true, endDate: true }, orderBy: { createdAt: "desc" } }) : null;
  const q = await searchParams;
  const blocked = [
    ...v.blocks.map((b) => ({
      start: b.startDate.toISOString().slice(0, 10),
      end: b.endDate.toISOString().slice(0, 10),
      reason: b.reason,
    })),
    ...v.bookings.map((b) => ({
      start: b.startDate.toISOString().slice(0, 10),
      end: b.endDate.toISOString().slice(0, 10),
      reason: "Reserved",
    })),
  ];
  return (
    <section className="wrap page">
      <p className="eyebrow">
        <Link href={user ? "/fleet" : "/#fleet"} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ArrowLeft size={14} aria-hidden="true" /> BACK TO VEHICLE SELECTION
        </Link>
      </p>
      <h1>
        {v.model.name} {v.model.year}
      </h1>
      <p>{v.model.description}</p>
      {q.message && (
        <p className="notice" role="alert">
          {q.message}
        </p>
      )}
      <div className="split">
        <div>
          <Viewer
            modelSlug={v.model.slug}
            url={v.media.find((m) => m.type === "MODEL")?.url}
            panorama={v.media.find((m) => m.type === "PANORAMA")?.url}
          />
          <div className="panel">
            <h3>A closer look.</h3>
            <p>
              Capacity: {v.model.seats ?? "Awaiting verified specifications"}
              <br />
              Transmission: {v.model.transmission ?? "Awaiting verification"}
              <br />
              Luggage: {v.model.luggage ?? "Awaiting verification"}
            </p>
            <p>{v.model.features.join(" · ")}</p>
          </div>
          <div className="list">
            {v.media
              .filter((m) => m.type === "IMAGE")
              .map((m) => (
                <div
                  key={m.id}
                  role="img"
                  aria-label={m.alt}
                  className="vehicle-image"
                  style={{ backgroundImage: `url(${m.url})` }}
                />
              ))}
          </div>
        </div>
        <div className={user && unfinished ? styles.card : user ? "panel" : "guest-booking-card"}>
          {user && unfinished ? <div className={styles.content}>
            <span className={styles.icon}><CalendarDays size={25} aria-hidden="true" /></span>
            <h2>Your next journey is already in motion</h2>
            <p>You have an active reservation for this car. View it below to continue or manage your request.</p>
            <div className={styles.reservation}>
              <div className={styles.vehicle}><strong>{v.model.name}</strong><span className={["CONFIRMED","DELIVERED"].includes(unfinished.status) ? styles.confirmed : styles.pending}>{unfinished.status === "DELIVERED" ? "Delivered" : unfinished.status === "CONFIRMED" ? "Confirmed" : "Pending review"}</span></div>
              <span className={styles.reference}>{unfinished.reference}</span>
              <div className={styles.dates}><CalendarDays size={16} aria-hidden="true" /><span>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(unfinished.startDate)}<ArrowRight size={14} aria-label="to" />{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(unfinished.endDate)}</span></div>
            </div>
            <Link className={styles.primary} href={reservationHref(unfinished.id, unfinished.status)}>{["CONFIRMED","DELIVERED"].includes(unfinished.status) ? "View your reservation" : "Continue your reservation"}<ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className={styles.secondary} href="/fleet">Browse other cars<ArrowRight size={16} aria-hidden="true" /></Link>
            <p className={styles.note}>You can request another car anytime. To reserve this car again, complete your current rental or have its cancellation approved.</p>
          </div> : user ? <ReservationForm
            initialStart={date.safeParse(q.start).success ? q.start : ""}
            initialEnd={date.safeParse(q.end).success ? q.end : ""}
            vehicleId={v.id}
            pricing={
              v.pricing
                ? {
                    dailyMinor: v.pricing.dailyMinor,
                    feeMinor: v.pricing.feeMinor,
                    depositMinor: v.pricing.depositMinor,
                    currency: v.pricing.currency,
                  }
                : null
            }
            blocked={blocked}
          /> : (
            <div className="guest-booking-content">
              <h2>Your next ride<br />starts here.</h2>
              <p className="guest-booking-intro">Sign in to plan your trip with {v.model.name}. Everything you need, in one place.</p>
              <div className="guest-booking-benefits">
                <div><span><CalendarDays size={18} /></span><div><strong>Find your dates</strong><p>Check availability for your travel plans.</p></div></div>
                <div><span><Wallet size={18} /></span><div><strong>See your rental total</strong><p>Review rates and your cost breakdown.</p></div></div>
                <div><span><ShieldCheck size={18} /></span><div><strong>Keep track of your booking</strong><p>Submit a request and follow it in your dashboard.</p></div></div>
              </div>
              <Link className="button guest-booking-signin" href={`/login?next=${encodeURIComponent(`/fleet/${v.id}`)}`}>Sign in to reserve<ArrowRight size={18} /></Link>
              <div className="guest-booking-register"><span>First time with TrustRide?</span><Link href={`/register?next=${encodeURIComponent(`/fleet/${v.id}`)}`}>Create an account<ArrowRight size={14} /></Link></div>
              <p className="guest-booking-footnote">Choose your dates and submit your request after signing in.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

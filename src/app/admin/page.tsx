export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export default async function Admin() {
  await requireAdmin();
  const now = new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [total, available, pending, confirmed, active, customers, payments] =
    await Promise.all([
      db.vehicle.count({ where: { archived: false } }),
      db.vehicle.count({
        where: {
          archived: false,
          status: "ACTIVE",
          bookings: {
            none: {
              status: { in: ["CONFIRMED", "DELIVERED"] },
              startDate: { lte: now },
              endDate: { gt: now },
            },
          },
          blocks: { none: { startDate: { lte: now }, endDate: { gt: now } } },
        },
      }),
      db.booking.count({ where: { status: "PENDING" } }),
      db.booking.count({ where: { status: "CONFIRMED" } }),
      db.booking.count({ where: { status: "DELIVERED" } }),
      db.userProfile.count({ where: { role: "CLIENT" } }),
      db.paymentRecord.groupBy({
        by: ["currency"],
        where: { status: "PAID" },
        _sum: { amountMinor: true },
      }),
    ]);
  return (
    <div className="overview-dashboard">
      <div className="admin-page-heading overview-heading">
        <div><h1>Dashboard overview</h1><p>Keep your fleet, reservations, and customers moving.</p></div>
        <Link href="/admin/vehicles" className="button small">Manage fleet <ArrowUpRight size={16} /></Link>
      </div>
      <div className="overview-pulse">
        <div><span className="overview-status-dot" /><strong>Fleet availability</strong><span>{available} of {total} vehicles ready for a reservation</span></div>
        <Link href="/admin/bookings">View availability <ArrowUpRight size={15} /></Link>
      </div>
      <div className="stats">
        {[
          { label: "Registered vehicles", n: total, href: "/admin/vehicles" },
          { label: "Available now", n: available, href: "/admin/bookings" },
          { label: "Active rentals", n: active, href: "/admin/bookings" },
          { label: "Pending requests", n: pending, href: "/admin/bookings" },
          { label: "Confirmed bookings", n: confirmed, href: "/admin/bookings" },
          { label: "Customers", n: customers, href: "/admin/customers" },
        ].map(({label, n, href}) => (
          <Link className="panel admin-stat overview-metric-card" key={label} href={href}>
            <div className="overview-metric-copy"><p>{label}</p><span className="admin-stat-link">View details</span></div>
            <strong className="overview-metric-count">{n}</strong>
          </Link>
        ))}
      </div>
      <div className="admin-quick-grid">
        <section className="panel overview-reservations">
          <div className="overview-section-heading"><span className={pending ? "overview-badge waiting" : "overview-badge"}>{pending ? "Needs attention" : "All caught up"}</span></div>
          <h2>Reservation desk</h2>
          <p>{pending ? `${pending} requests are waiting for your review.` : "You’re all caught up. New reservation requests will appear here."}</p>
          <Link className="text-link" href="/admin/bookings">Review reservations <ArrowUpRight size={15} /></Link>
        </section>
        <section className="panel overview-operations">
          <div className="overview-section-heading"><span className="overview-section-label">QUICK ACCESS</span></div>
          <h2>Fleet operations</h2><p>Keep vehicle details, rental rates, and unavailable dates up to date.</p>
          <div className="admin-shortcuts"><Link href="/admin/pricing"><span>Rental pricing<small>Manage your rates</small></span><ArrowUpRight size={17} /></Link><Link href="/admin/bookings"><span>Reservations calendar<small>Manage bookings and dates</small></span><ArrowUpRight size={17} /></Link></div>
        </section>
      </div>
      <div className="notice overview-payments">
        <div><strong>Payment records</strong><p>
        {payments.length
          ? payments
              .map(
                (p) =>
                  `${p.currency} ${((p._sum.amountMinor ?? 0) / 100).toFixed(2)} in recorded payments`,
              )
              .join(" · ")
          : "Revenue is unavailable until payment records are supplied. No payment processor is connected."}
        </p></div>
      </div>
    </div>
  );
}

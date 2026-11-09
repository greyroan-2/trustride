"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

type Activity = { id: string; createdAt: string; email: string; action: string };
const actionNames: Record<string, string> = {
  vehicle: "Vehicle saved", model: "Model updated", pricing: "Pricing updated",
  booking: "Reservation updated", archive: "Vehicle archived", block: "Dates blocked",
  unblock: "Date block removed", "unblock-day": "Day enabled", media: "Media linked", testimonial: "Testimonial created",
  publish: "Publication updated",
  "payment-review": "Payment proof reviewed",
};

export function AdminSettings({ name, email, activity }: { name: string; email: string; activity: Activity[] }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const filtered = activity.filter(item => (!action || item.action === action) &&
    `${item.email} ${actionNames[item.action] ?? item.action}`.toLowerCase().includes(query.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <div className="settings-workspace">
      <div className="vehicles-heading"><div><h1>Settings</h1><p>Your account, rental operations, and administration history.</p></div></div>
      <div className="settings-top-grid">
        <section className="panel settings-account">
          <div className="settings-section-title"><h2>Administrator account</h2></div>
          <p>Manage the details you use to access TrustRide.</p>
          <dl className="settings-values"><div><dt>Name</dt><dd>{name || "Not provided"}</dd></div><div><dt>Email</dt><dd>{email}</dd></div><div><dt>Access level</dt><dd><span className="overview-badge">Administrator</span></dd></div></dl>
          <Link href="/profile" className="button small">Edit profile & password <ArrowUpRight size={15} /></Link>
        </section>
        <section className="panel">
          <h2>Rental operations</h2><p>Current rules used by the reservation system.</p>
          <dl className="settings-values">
            <div><dt>Business timezone</dt><dd>Asia/Manila</dd></div>
            <div><dt>Currency</dt><dd>PHP · Philippine peso</dd></div>
            <div><dt>Reservations</dt><dd>Administrator approval</dd></div>
            <div><dt>Pending requests</dt><dd>Do not block rental dates</dd></div>
            <div><dt>Online payments</dt><dd>Not connected</dd></div>
          </dl>
          <p className="settings-hint">These operating rules are managed in the application configuration.</p>
        </section>
      </div>
      <section className="panel settings-links-section">
        <h2>Manage your business</h2><p>Go directly to the controls for each part of your rental operation.</p>
        <div className="settings-links">
          {[
            ["Vehicles", "Units, specifications, and photos", "/admin/vehicles"],
            ["Rental pricing", "Daily rates, fees, and deposits", "/admin/pricing"],
            ["Reservations calendar", "Bookings and disabled dates", "/admin/bookings"],
          ].map(([label, description, href]) => <Link key={href} href={href}><span><strong>{label}</strong><small>{description}</small></span><ArrowUpRight size={18} /></Link>)}
        </div>
      </section>
      <section className="panel settings-activity" aria-labelledby="activity-title">
        <div className="settings-activity-heading"><div><h2 id="activity-title">Recent admin activity</h2><p>The latest {activity.length} recorded actions. Times shown in Asia/Manila.</p></div><span className="settings-record-count">{filtered.length} results</span></div>
        <div className="settings-filters">
          <label><span>Search activity</span><span className="settings-search"><Search size={17} aria-hidden="true" /><input type="search" placeholder="Search by administrator or action" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></span></label>
          <label>Action<select value={action} onChange={event => { setAction(event.target.value); setPage(0); }}><option value="">All actions</option>{Array.from(new Set(activity.map(item => item.action))).sort().map(value => <option key={value} value={value}>{actionNames[value] ?? value}</option>)}</select></label>
        </div>
        {filtered.length ? <>
          <div className="settings-table-scroll"><table><thead><tr><th scope="col">Action</th><th scope="col">Administrator</th><th scope="col">Date & time</th></tr></thead><tbody>{filtered.slice(currentPage * 10, currentPage * 10 + 10).map(item => <tr key={item.id}><td><span className="settings-action-label">{actionNames[item.action] ?? item.action}</span></td><td>{item.email}</td><td><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></td></tr>)}</tbody></table></div>
          <div className="settings-pagination"><span aria-live="polite">Page {currentPage + 1} of {pageCount}</span><div><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
        </> : <div className="settings-empty" role="status"><strong>{activity.length ? "No matching activity" : "No activity recorded yet"}</strong><p>{activity.length ? "Try a different search or action filter." : "Administrator actions will appear here as changes are made."}</p>{(query || action) && <button type="button" onClick={() => { setQuery(""); setAction(""); setPage(0); }}>Clear filters</button>}</div>}
      </section>
      <details className="panel settings-technical"><summary>Deployment & access configuration</summary><p>Authentication, storage credentials, site URL, and database connections are managed through server environment variables. Contact the deployment administrator to change them.</p><p>Administrator access is provisioned through the documented operator process.</p></details>
    </div>
  );
}

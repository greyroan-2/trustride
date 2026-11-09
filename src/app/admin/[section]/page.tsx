import { AdminCustomers } from "@/components/admin-customers";
import { AdminTestimonials } from "@/components/admin-testimonials";
﻿import type { Prisma } from "@prisma/client";
import { requestPagination, requestListHref } from "@/lib/request-pagination";
import { z } from "zod";
import { RequestFilters } from "@/components/request-filters";
import { AdminActionAlert } from "@/components/admin-action-alert";
import { reservationPaymentState } from "@/lib/reservation-payment";
import Link from "next/link";
import { RequestTableRow } from "@/components/request-sections";
import { uploadPhoto } from "@/app/actions/upload";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminMutation } from "@/app/actions/admin";
import { AdminPricingWorkspace } from "@/components/admin-pricing-workspace";
import { SuccessToast } from "@/components/success-toast";
import { AdminSettings } from "@/components/admin-settings";
import { AdminReservationCalendar } from "@/components/admin-reservation-calendar";
import { VehiclePhotoManager } from "@/components/vehicle-photo-manager";
import { AdminRequestCard } from "@/components/admin-request-card";
import { BookingRefresh } from "@/components/booking-refresh";
import { Plus } from "lucide-react";
function Hidden({ action, id }: { action: string; id?: string }) {
  return (
    <>
      <input type="hidden" name="action" value={action} />
      {id && <input type="hidden" name="id" value={id} />}
    </>
  );
}
export default async function AdminSection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ message?: string; noticeId?: string; month?: string; vehicle?: string; q?: string; status?: string; request?: string; customer?: string; page?: string }>;
}) {
  const administrator = await requireAdmin();
  const { section } = await params;
  const { message, noticeId, month: requestedMonth, vehicle: selectedPricingVehicle } = await searchParams;
  const filters = await searchParams;
  const query = (filters.q ?? "").trim().slice(0, 100);
  const filterStatus = ["PENDING", "CONFIRMED", "DELIVERED", "REJECTED", "CANCELLED", "COMPLETED"].includes(filters.status ?? "") ? filters.status! : "";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const month = requestedMonth && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today.slice(0, 7);
  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  if (
    ![
      "vehicles",
      "bookings",
      "requests",
      "customers",
      "pricing",
      "testimonials",
      "settings",
    ].includes(section)
  )
    notFound();
  if (section === "settings") {
    const activity = await db.adminAuditLog.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { email: true } } },
    });
    return <AdminSettings name={administrator.name} email={administrator.email} activity={activity.map(item => ({ id: item.id, action: item.action, email: item.actor.email, createdAt: item.createdAt.toISOString() }))} />;
  }
  const vehicles = ["vehicles", "pricing", "bookings"].includes(section)
    ? await db.vehicle.findMany({
        include: { model: true, pricing: true, media: true },
        orderBy: { unitCode: "asc" },
      })
    : [];
  const calendarPeriods = section === "bookings" ? await Promise.all([
    db.booking.findMany({ where: { status: { in: ["CONFIRMED", "DELIVERED", "PENDING"] } }, select: { id: true, vehicleId: true, startDate: true, endDate: true, status: true, totalMinor: true, currency: true, payments: { where: { status: "PAID" }, select: { amountMinor: true, currency: true, status: true } } } }),
    db.availabilityBlock.findMany({ where: { startDate: { lt: monthEnd }, endDate: { gt: monthStart } }, select: { id: true, vehicleId: true, startDate: true, endDate: true } }),
  ]) : null;
  const requestWhere: Prisma.BookingWhereInput = {
    ...(filterStatus ? { status: filterStatus as "PENDING" | "CONFIRMED" | "DELIVERED" | "REJECTED" | "CANCELLED" | "COMPLETED" } : {}),
    ...(query ? { OR: [{ reference: { contains: query, mode: "insensitive" } }, { customer: { name: { contains: query, mode: "insensitive" } } }, { vehicle: { model: { name: { contains: query, mode: "insensitive" } } } }] } : {}),
  };
  const requestTotal = section === "requests" ? await db.booking.count({ where: requestWhere }) : 0;
  const pagination = requestPagination(requestTotal, filters.page);
  const requests = section === "requests" ? await db.booking.findMany({
    where: requestWhere,
    include: { customer: true, vehicle: { include: { model: true, media: { where: { type: "IMAGE" } } } }, workflow: true, payments: { where: { status: "PAID" } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: pagination.skip,
    take: pagination.take,
  }) : [];
  const selectedRequest = requests.find(booking => booking.id === filters.request) ??
    (section === "requests" && z.uuid().safeParse(filters.request).success ? await db.booking.findUnique({
      where: { id: filters.request },
      include: { customer: true, vehicle: { include: { model: true, media: { where: { type: "IMAGE" } } } }, workflow: true, payments: { where: { status: "PAID" } } },
    }) : null) ?? requests[0];
  return (
    <>
      {section !== "vehicles" && <h1 style={{ textTransform: "capitalize", fontSize: 40 }}>
        {section === "bookings" ? "Reservations" : section}
      </h1>}
      {message && (["Saved.", "Photo uploaded.", "Photo deleted."].includes(message) ? <SuccessToast key={noticeId ?? message} message={message} /> : <AdminActionAlert key={noticeId ?? message} message={message} />)}
      {section === "vehicles" && (
        <div className="vehicles-workspace">
          <div className="vehicles-heading">
            <div><h1>Your fleet</h1><p>Manage your vehicles, specifications, and photos in one place.</p></div>
          </div>
          <div className="vehicles-summary" aria-label="Fleet summary">
            <div><span>Registered vehicles<strong>{vehicles.filter(v => !v.archived).length}</strong></span></div>
            <div><span className="vehicle-status-dot active" /><span>Active status<strong>{vehicles.filter(v => !v.archived && v.status === "ACTIVE").length}</strong></span></div>
            <div><span className="vehicle-status-dot maintenance" /><span>Maintenance<strong>{vehicles.filter(v => !v.archived && v.status === "MAINTENANCE").length}</strong></span></div>
            <div><span className="vehicle-status-dot archived" /><span>Archived<strong>{vehicles.filter(v => v.archived).length}</strong></span></div>
          </div>
          <details className="panel vehicle-add-panel">
            <summary><Plus size={18} /> Add a vehicle<span>Register a new unit in your fleet</span></summary>
            <form action={adminMutation} className="form">
              <Hidden action="vehicle" />
              <label>
                Model
                <select name="modelId">
                  {(await db.vehicleModel.findMany()).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Unit code
                <input name="unitCode" required maxLength={50} />
              </label>
              <label>
                Status
                <select name="status">
                  <option>ACTIVE</option>
                  <option>UNAVAILABLE</option>
                  <option>MAINTENANCE</option>
                </select>
              </label>
              <button className="button">Add vehicle</button>
            </form>
          </details>
          <div className="vehicle-management-grid">
          {vehicles.map((v) => (
            <article className="panel vehicle-management-card" key={v.id}>
              <div className="vehicle-card-visual" style={{ backgroundImage: `url(${v.model.slug.includes("veloz") ? "/images/veloz.webp?v=622f91c07d" : v.media.find(m => m.type === "IMAGE")?.url ?? (v.model.slug.includes("innova") ? "/images/innova.webp" : "")})` }}>
                <span className={`vehicle-status-pill ${v.archived ? "archived" : v.status.toLowerCase()}`}>{v.archived ? "Archived" : v.status === "ACTIVE" ? "Active" : v.status === "MAINTENANCE" ? "Maintenance" : "Unavailable"}</span>
              </div>
              <div className="vehicle-card-content">
              <div className="vehicle-card-title"><div><p>{v.unitCode}</p><h2>{v.model.name}</h2></div></div>
              <div className="vehicle-specifications"><span>{v.model.year ?? "Year not set"}</span><span>{v.model.seats ? `${v.model.seats} seats` : "Seats not set"}</span><span>{v.model.transmission ?? "Transmission not set"}</span></div>
              <form action={adminMutation} className="form vehicle-unit-form">
                <Hidden action="vehicle" id={v.id} />
                <input type="hidden" name="modelId" value={v.modelId} />
                <label className="vehicle-name-field">
                  Vehicle name
                  <input name="vehicleName" defaultValue={v.model.name} required maxLength={100} aria-describedby={`vehicle-name-hint-${v.id}`} />
                  <small id={`vehicle-name-hint-${v.id}`}>Displayed across the site. Applies to all units of this model.</small>
                </label>
                <label>
                  Unit code
                  <input name="unitCode" defaultValue={v.unitCode} required />
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={v.status}>
                    <option>ACTIVE</option>
                    <option>UNAVAILABLE</option>
                    <option>MAINTENANCE</option>
                  </select>
                </label>
                <button className="button">Save vehicle</button>
              </form>
              <details className="vehicle-editor">
                <summary>Edit shared model details</summary>
                <form className="form" action={adminMutation}>
                  <Hidden action="model" id={v.modelId} />
                  {[
                    ["name", "Model name", v.model.name],
                    ["category", "Category", v.model.category],
                    ["year", "Verified model year", v.model.year],
                    ["seats", "Verified seating capacity", v.model.seats],
                    [
                      "transmission",
                      "Verified transmission",
                      v.model.transmission,
                    ],
                    [
                      "luggage",
                      "Verified luggage description",
                      v.model.luggage,
                    ],
                    ["description", "Description", v.model.description],
                    [
                      "features",
                      "Verified features, separated by commas",
                      v.model.features.join(", "),
                    ],
                  ].map(([name, label, value]) => (
                    <label key={String(name)}>
                      {label}
                      <input
                        name={String(name)}
                        defaultValue={String(value ?? "")}
                      />
                    </label>
                  ))}
                  <button className="button">Save model</button>
                </form>
              </details>
              <details className="vehicle-editor">
                <summary>Upload a vehicle photo</summary>
                <form action={uploadPhoto} className="form">
                  <input type="hidden" name="id" value={v.id} />
                  <label>
                    Photo (JPEG or PNG, maximum 5 MB)
                    <input
                      type="file"
                      name="photo"
                      accept="image/jpeg,image/png"
                      required
                    />
                  </label>
                  <label>
                    Photo description
                    <input name="alt" required maxLength={200} />
                  </label>
                  <button className="button">Upload photo</button>
                </form>
              </details>
              <VehiclePhotoManager vehicleId={v.id} photos={v.media.filter(media => media.type === "IMAGE").map(media => ({ id: media.id, url: v.model.slug.includes("veloz") && /^\/images\/veloz\.(jpg|webp)(\?.*)?$/.test(media.url) ? "/images/veloz.webp?v=622f91c07d" : media.url, alt: media.alt }))} />
              <details className="vehicle-editor">
                <summary>Link photo, GLB model, or panorama</summary>
                <p className="discreet">
                  Upload licensed assets to Supabase Storage first, then paste
                  the HTTPS asset URL. Interactive models must be verified
                  against the actual vehicle.
                </p>
                <form action={adminMutation} className="form">
                  <Hidden action="media" id={v.id} />
                  <label>
                    Asset URL
                    <input name="url" type="url" required />
                  </label>
                  <label>
                    Type
                    <select name="type">
                      <option>IMAGE</option>
                      <option>MODEL</option>
                      <option>PANORAMA</option>
                    </select>
                  </label>
                  <label>
                    Description
                    <input name="alt" required maxLength={200} />
                  </label>
                  <button className="button">Link asset</button>
                </form>
                {v.media.map((m) => (
                  <p key={m.id}>
                    {m.type}: {m.alt}
                  </p>
                ))}
              </details>
              {!v.archived && (
                <form action={adminMutation} className="vehicle-archive-form">
                  <Hidden action="archive" id={v.id} />
                  <button className="button outline">Archive vehicle</button>
                </form>
              )}
              </div>
            </article>
          ))}
          </div>
          {vehicles.length === 0 && <div className="panel vehicles-empty"><h2>Your fleet starts here</h2><p>Add your first vehicle using the form above.</p></div>}
        </div>
      )}
      {section === "pricing" && (
        <AdminPricingWorkspace initialVehicleId={selectedPricingVehicle} vehicles={vehicles.filter(v => !v.archived).map(v => ({ id: v.id, name: v.model.name, unitCode: v.unitCode, revision: v.pricing?.updatedAt.toISOString() ?? "new", image: v.model.slug.includes("veloz") ? "/images/veloz.webp?v=622f91c07d" : v.media.find(media => media.type === "IMAGE")?.url ?? "/images/innova.webp", pricing: v.pricing ? { dailyMinor: v.pricing.dailyMinor, feeMinor: v.pricing.feeMinor, depositMinor: v.pricing.depositMinor, distancePricing: v.pricing.distancePricing } : null }))} />
      )}
      {section === "bookings" && (
        <div className="list">
          <BookingRefresh />
          <AdminReservationCalendar month={month} today={today} vehicles={vehicles.map(vehicle => ({ id: vehicle.id, name: vehicle.model.name, unitCode: vehicle.unitCode, status: vehicle.archived ? "ARCHIVED" : vehicle.status }))} periods={calendarPeriods ? [...calendarPeriods[0].map(period => ({ id: period.id, vehicleId: period.vehicleId, start: period.startDate.toISOString().slice(0, 10), end: period.endDate.toISOString().slice(0, 10), status: period.status, fullyPaid: reservationPaymentState(period.totalMinor, period.currency, period.payments).fullyPaid })), ...calendarPeriods[1].map(period => ({ id: period.id, vehicleId: period.vehicleId, start: period.startDate.toISOString().slice(0, 10), end: period.endDate.toISOString().slice(0, 10), status: "BLOCKED" }))] : []} />
          </div>
      )}
      {section === "requests" && (
        <div className="list requests-workspace">
          <BookingRefresh />
          <div className="reservation-history-heading"><p>Select a transaction on the left to review the vehicle, documents, payment, and actions.</p></div>

          <div className="request-split-layout">
            <aside className="request-list-pane" aria-label="Request list">
              <div className="request-list-title"><h2>Transactions</h2><span>{requestTotal} results</span></div>
              <RequestFilters query={query} status={filterStatus} />
              <div className="request-table-scroll"><table className="request-selection-table"><caption className="sr-only">Select a transaction to view its request details</caption><thead><tr><th scope="col">Transaction number</th><th scope="col">Name</th><th scope="col">Status</th></tr></thead><tbody>{requests.map(booking => {
                const href = requestListHref(query, filterStatus, pagination.page, booking.id);
                return <RequestTableRow key={booking.id} href={href} selected={selectedRequest?.id === booking.id}><td><Link href={href} scroll={false} aria-current={selectedRequest?.id === booking.id ? "true" : undefined}>{booking.reference}</Link></td><td>{booking.customer.name || booking.customer.email}</td><td><span className={`reservation-history-status ${booking.status.toLowerCase()}`}>{booking.status.toLowerCase()}</span></td></RequestTableRow>;
              })}</tbody></table>{requests.length === 0 && <div className="request-table-empty"><h3>No requests found</h3><p>Try another name, transaction number, or status.</p><Link href="/admin/requests">Clear filters</Link></div>}</div>
              <div className="request-pagination">
                <p>{requestTotal ? `${pagination.skip + 1}–${pagination.skip + requests.length} of ${requestTotal}` : "0 results"}</p>
                <nav aria-label="Transaction pages">
                  {pagination.page > 1 ? <Link href={requestListHref(query, filterStatus, pagination.page - 1)} scroll={false}>Previous</Link> : <span aria-disabled="true">Previous</span>}
                  <span className="request-page-number" aria-live="polite">Page {pagination.page} of {pagination.pages}</span>
                  {pagination.page < pagination.pages ? <Link href={requestListHref(query, filterStatus, pagination.page + 1)} scroll={false}>Next</Link> : <span aria-disabled="true">Next</span>}
                </nav>
              </div>
            </aside>
            <section className="request-detail-pane" aria-label="Selected request details">{selectedRequest ? <AdminRequestCard key={selectedRequest.id} booking={selectedRequest} /> : <div className="request-detail-empty"><h2>No request selected</h2><p>Select a transaction from the list to view its complete details.</p></div>}</section>
          </div>
        </div>
      )}
      {section === "customers" && <AdminCustomers query={query} page={filters.page} customer={filters.customer} />}
      {section === "testimonials" && <AdminTestimonials administratorId={administrator.id} testimonials={await db.testimonial.findMany({ orderBy: [{ published: "asc" }, { author: "asc" }], select: { id: true, author: true, content: true, published: true, sample: true, customerId: true, rating: true, customer: { select: { avatarPath: true } } } })} />}

    </>
  );
}




import { activeSessionUser } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { reservationNotification } from "@/lib/reservation-notifications";

export const dynamic = "force-dynamic";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  try {
    const user = await activeSessionUser();
    if (!user) return Response.json({ error: "Sign in to view notifications." }, { status: 401, headers });
    const bookings = await db.booking.findMany({
      where: { customerId: user.id, status: { in: ["PENDING", "CONFIRMED", "DELIVERED", "REJECTED"] } },
      select: { id: true, reference: true, status: true, deliveredAt: true, createdAt: true, vehicle: { select: { model: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    const updates = bookings.length ? await db.adminAuditLog.findMany({
      where: { targetId: { in: bookings.map(booking => booking.id) }, action: { in: ["booking", "payment-review"] } },
      select: { targetId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }) : [];
    const latestUpdates = new Map<string, Date>();
    for (const update of updates) if (!latestUpdates.has(update.targetId)) latestUpdates.set(update.targetId, update.createdAt);
    const notifications = bookings.map(booking => reservationNotification({
      ...booking, createdAt: booking.status === "DELIVERED" ? booking.deliveredAt ?? booking.createdAt : latestUpdates.get(booking.id) ?? booking.createdAt, name: booking.vehicle.model.name,
    })).filter(item => item !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Response.json({ userId: user.id, notifications }, { headers });
  } catch {
    return Response.json({ error: "Notifications are temporarily unavailable." }, { status: 503, headers });
  }
}


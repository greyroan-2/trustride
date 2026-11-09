import { db } from "@/lib/db";
import { money } from "@/lib/validation";
import { ReservationList } from "@/components/reservation-list";

export async function BookingList({ customerId }: { customerId: string }) {
  const bookings = await db.booking.findMany({
    where: { customerId },
    include: { vehicle: { include: { model: true, media: true } } },
    orderBy: { createdAt: "desc" },
  });
  return <ReservationList bookings={bookings.map((booking) => ({
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    name: booking.vehicle.model.name,
    category: booking.vehicle.model.category,
    image: booking.vehicle.model.slug.includes("veloz")
      ? "/images/veloz.webp?v=622f91c07d"
      : booking.vehicle.media.find((media) => media.type === "IMAGE")?.url ?? null,
    start: booking.startDate.toISOString(),
    end: booking.endDate.toISOString(),
    total: money(booking.totalMinor, booking.currency),
  }))} />;
}

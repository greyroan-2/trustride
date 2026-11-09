export type ReservationNotification = {
  id: string;
  bookingId: string;
  title: string;
  message: string;
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "REJECTED";
  createdAt: string;
};

export function reservationNotification(booking: { id: string; reference: string; status: string; createdAt: Date; name: string }): ReservationNotification | null {
  const status = booking.status;
  if (status !== "PENDING" && status !== "CONFIRMED" && status !== "DELIVERED" && status !== "REJECTED") return null;
  const titles = { PENDING: "Reservation pending", CONFIRMED: "Reservation confirmed", DELIVERED: "Your rental has started", REJECTED: "Reservation rejected" };
  const messages = { PENDING: "Your request is awaiting review.", CONFIRMED: "Your request has been approved.", DELIVERED: "The unit is now with you. Your rental is underway.", REJECTED: "Your request was not approved." };
  return {
    id: `${booking.id}:${status}`,
    bookingId: booking.id,
    title: titles[status],
    message: `${booking.name} · ${booking.reference}. ${messages[status]}`,
    status,
    createdAt: booking.createdAt.toISOString(),
  };
}

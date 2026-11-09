export function canDeleteBookingRequest(status: string): boolean {
  return ["CANCELLED", "CONFIRMED", "REJECTED"].includes(status);
}

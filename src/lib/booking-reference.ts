// Shared across every creation date and deletion to prevent number reuse.
export const bookingReferenceLock = "trustride:booking-reference:global";
export const bookingReferencePattern = "^TR-[0-9]{4}/[0-9]{2}/[0-9]{2}-[0-9]+$";

export function bookingReferencePrefix(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `TR-${date.replaceAll("-", "/")}-`;
}

export function formatBookingReference(prefix: string, number: bigint) {
  if (number < 1n) throw new Error("Invalid reference number.");
  return `${prefix}${number.toString().padStart(6, "0")}`;
}

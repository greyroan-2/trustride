import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
export const rentalTimesSchema = z.object({
  pickupTime: z.string().regex(timePattern, "Choose a valid pickup time."),
  dropoffTime: z.string().regex(timePattern, "Choose a valid drop-off time."),
});
export function formatRentalTime(value?: string): string {
  if (!value || !timePattern.test(value)) return "Not provided";
  const [hour, minute] = value.split(":");
  const hours = Number(hour);
  return `${hours % 12 || 12}:${minute} ${hours >= 12 ? "PM" : "AM"}`;
}

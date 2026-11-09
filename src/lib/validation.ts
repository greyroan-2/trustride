import { z } from "zod";
export const credentials = z.object({
  email: z.email(),
  password: z.string().min(10).max(128),
});
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Invalid calendar date");
export const reservation = z
  .object({
    vehicleId: z.uuid(),
    start: date,
    end: date,
    notes: z.string().max(1500),
  })
  .refine((v) => v.end > v.start, "Return must follow pickup")
  .refine(
    (v) =>
      v.start >=
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    "Pickup must be today or later",
  );
export function calculatePrice(
  start: string,
  end: string,
  daily: number,
  fee: number,
  deposit: number,
) {
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (!Number.isInteger(days) || days < 1 || days > 365)
    throw new Error("Choose a period between 1 and 365 days.");
  if ([daily, fee, deposit].some((n) => !Number.isSafeInteger(n) || n < 0))
    throw new Error("Invalid pricing configuration.");
  const subtotal = days * daily;
  const total = subtotal + fee + deposit;
  if (!Number.isSafeInteger(total))
    throw new Error("Price exceeds supported range.");
  return { days, subtotal, fee, deposit, total };
}
export const money = (minor: number, currency = "PHP") =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(
    minor / 100,
  );

// Parse decimal pesos as strings so amounts such as 1.01 never lose a cent.
export const pesoAmount = z.string().trim().regex(/^\d{1,7}(?:\.\d{1,2})?$/, "Enter a peso amount with up to two decimal places.")
  .transform(value => {
    const [pesos, cents = ""] = value.split(".");
    return Number(pesos) * 100 + Number(cents.padEnd(2, "0"));
  })
  .pipe(z.number().int().min(0).max(100000000));

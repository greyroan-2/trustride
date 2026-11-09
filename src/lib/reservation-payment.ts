export function reservationPaymentState(totalMinor: number, currency: string, payments: { amountMinor: number; currency: string; status: string }[]) {
  const paidMinor = payments.filter(payment => payment.status === "PAID" && payment.currency === currency).reduce((total, payment) => total + payment.amountMinor, 0);
  return { paidMinor, balanceMinor: Math.max(0, totalMinor - paidMinor), fullyPaid: paidMinor >= totalMinor };
}
export function reservationCalendarLabel(status: string, fullyPaid = false) {
  return status === "DELIVERED" ? fullyPaid ? "Delivered - Fully paid" : "Delivered - Balance due" : status === "CONFIRMED" ? fullyPaid ? "Booked · Fully paid" : "Reserved · Balance due" : status === "PENDING" ? "Pending request" : "Disabled";
}

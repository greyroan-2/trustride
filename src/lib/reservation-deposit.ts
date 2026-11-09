export function reservationDepositMinor(totalMinor: number): number {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) throw new Error("Invalid booking total.");
  return Math.ceil(totalMinor / 2);
}
export function reservationDepositError(totalMinor: number, paidMinor: number, receiptMinor: number): string | null {
  if (paidMinor > 0) return "A payment is already recorded. Please contact TrustRide to arrange the remaining balance.";
  if (totalMinor <= 0 || receiptMinor !== reservationDepositMinor(totalMinor)) return "The receipt must show exactly the 50% reservation payment. This payment is non-refundable.";
  return null;
}

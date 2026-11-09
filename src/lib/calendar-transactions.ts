export const DATE_TRANSACTIONS_MESSAGE = "These dates have pending, confirmed, or delivered transactions. Please review the transactions on these dates before disabling availability.";

export function transactionsOnDates<T extends { start: string; end: string; status: string }>(periods: T[], start: string, end: string) {
  if (!start || !end || end <= start) return [];
  return periods.filter(period => ["PENDING", "CONFIRMED", "DELIVERED"].includes(period.status) && period.start < end && period.end > start);
}

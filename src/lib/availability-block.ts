export function remainingBlockedPeriods(start: Date, end: Date, day: Date) {
  const next = new Date(day.getTime() + 86400000);
  if (day < start || day >= end) throw new Error("Day is outside this block.");
  const remaining: { startDate: Date; endDate: Date }[] = [];
  if (start < day) remaining.push({ startDate: start, endDate: day });
  if (end > next) remaining.push({ startDate: next, endDate: end });
  return remaining;
}

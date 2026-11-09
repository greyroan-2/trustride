export const dynamic = "force-dynamic";
import { ReservationSummary } from "@/components/reservation-summary";
export default async function ReservationInformation({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <ReservationSummary bookingId={bookingId} expectedStatus="CONFIRMED" />;
}

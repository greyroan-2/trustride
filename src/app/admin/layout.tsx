import { profilePhotoUrl } from "@/lib/profile-photo";
export const dynamic = "force-dynamic";
import { AdminShell } from "@/components/admin-shell";
import { db } from "@/lib/db";
import { BookingRefresh } from "@/components/booking-refresh";
import { requireAdmin } from "@/lib/auth";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const requestCount = await db.booking.count({ where: { OR: [{ status: "PENDING" }, { cancellationRequested: true }, { status: { in: ["CONFIRMED","DELIVERED"] }, workflow: { data: { path: ["paymentProof", "status"], equals: "PENDING" } } }] } });
  return (
    <AdminShell avatarUrl={profilePhotoUrl(user.avatarPath)} name={user.name} email={user.email} requestCount={requestCount}><BookingRefresh />{children}</AdminShell>
  );
}

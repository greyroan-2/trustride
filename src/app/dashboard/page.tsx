export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BookingList } from "@/components/booking-list";
export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  if (user.role === "ADMIN") redirect("/admin");
  return (
    <section className="wrap page">
      <h1>Welcome, {user.name || "traveller"}</h1>
      <p>Upcoming rentals, reservation requests, and your journey history.</p>
      <div className="button-row">
        <Link className="button dashboard-find-ride" href="/fleet">
          Find Your Ride
        </Link>
        <Link href="/profile" className="text-link">
          Account settings
        </Link>
      </div>
      <h2 style={{ marginTop: 50 }}>Your reservations.</h2>
      <BookingList customerId={user.id} />
    </section>
  );
}

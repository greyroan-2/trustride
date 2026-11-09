export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BookingList } from "@/components/booking-list";
import styles from "@/components/reservations.module.css";

export default async function Bookings() {
  const user = await requireUser("/bookings");
  return (
    <section className={`wrap page ${styles.page}`}>
      <div className={styles.heading}>
        <div><h1>Your reservations</h1><p>Every journey, all in one place. Keep track of your requests and rides.</p></div>
        <Link className={styles.newBooking} href="/fleet">Find your next ride <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
      <BookingList customerId={user.id} />
    </section>
  );
}


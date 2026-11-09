"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/bookings/") || pathname === "/login" || pathname === "/register" || pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return (
    <footer>
      <div className="wrap footer-grid">
        <div>
          <Link href="/" className="brand">
            <Image src="/images/trust%20ride%20logo.jpg" alt="TrustRide Car Rental Services" width={180} height={180} />
          </Link>
          <p>
            A better journey begins with trust.
            <br />
            Comfortable rides. Thoughtful service.
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link href="/about">Our story</Link>
          <Link href="/services">Our Requirements</Link>
          <Link href="/fleet">Find your ride</Link>
        </div>
        <div>
          <h3>Let’s connect</h3>
          <p>Business email and phone coming soon.</p>
          <p>Social profiles coming soon.</p>
          <Link href="/contact">Contact information →</Link>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>
          © {new Date().getFullYear()} TrustRide. All rights reserved.
        </span>
        <div>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms & Conditions</Link>
        </div>
      </div>
    </footer>
  );
}

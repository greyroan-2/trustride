"use client";
import { UserAvatar } from "./user-avatar";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CarFront, CalendarDays, Users, Wallet, MessageSquare, Settings, ArrowUpRight, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { PageTransition } from "@/components/page-transition";

const sections = [
  { label: "Overview", path: "/admin", icon: LayoutDashboard },
  { label: "Reservations", path: "/admin/bookings", icon: CalendarDays },
  { label: "Requests", path: "/admin/requests", icon: MessageSquare },
  { label: "Vehicles", path: "/admin/vehicles", icon: CarFront },
  { label: "Customers", path: "/admin/customers", icon: Users },
  { label: "Pricing", path: "/admin/pricing", icon: Wallet },
  { label: "Testimonials", path: "/admin/testimonials", icon: MessageSquare },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export function AdminShell({ children, name, email, avatarUrl, requestCount }: { avatarUrl?: string | null; requestCount: number; children: React.ReactNode; name: string; email: string }) {
  const pathname = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-logo" aria-label="TrustRide administration">
          <Image src="/images/trust%20ride%20logo.jpg" alt="TrustRide" width={160} height={160} priority />
        </Link>
        <div className="admin-account admin-sidebar-account">
          <UserAvatar src={avatarUrl} name={name || email} size={42} />
          <div><strong>{name || "Administrator"}</strong><small><ShieldCheck size={12} /> Administrator</small></div>
        </div>
        <p className="admin-nav-label">WORKSPACE</p>
        <nav aria-label="Administration" className="admin-nav">
          {sections.map(({ label, path, icon: Icon }) => (
            <Link key={path} href={path} aria-current={pathname === path ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.7} /><span>{label}</span>{path === "/admin/requests" && requestCount > 0 && <span className="request-count" aria-label={`${requestCount} requests awaiting review`}>{requestCount}</span>}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" className="admin-site-link">View website <ArrowUpRight size={16} /></Link>
          <LogoutButton className="admin-signout" showIcon />
        </div>
      </aside>
      <div className="admin-workspace">
        <div className="admin-content"><PageTransition withinAdmin>{children}</PageTransition></div>
        <div className="admin-workspace-footer">TrustRide administration <span>Manage every journey with care.</span></div>
      </div>
    </div>
  );
}

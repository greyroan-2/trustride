"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "./notification-provider";
import { LogoutButton } from "@/components/logout-button";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Menu, X, ChevronDown } from "lucide-react";
import { UserAvatar } from "./user-avatar";
export function Header({ user, authUnavailable = false }: { user: { email?: string; name?: string; avatarUrl?: string | null; isAdmin?: boolean } | null; authUnavailable?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [accountPath, setAccountPath] = useState<string | null>(null);
  const accountOpen = accountPath === pathname;
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!accountOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setAccountPath(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [accountOpen]);
  const { notifications, read } = useNotifications();
  const hasUnread = !user?.isAdmin && notifications.some(item => !read.includes(item.id));
  const router = useRouter();
  if (pathname.startsWith("/bookings/") || pathname === "/login" || pathname === "/register" || pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return (
    <header className="site-header">
      <div className="nav wrap">
        <Link href="/" className="brand">
          <Image src="/images/trust%20ride%20logo.jpg" alt="TrustRide Car Rental Services" width={180} height={180} priority />
        </Link>
        <nav id="main-navigation" aria-label="Main navigation" className={open ? "open" : ""}>
          {[
            ["Home", "/"],
            ["About Us", "/about"],
            ["Our Requirements", "/services"],
            ["Testimonials", "/testimonials"],
            ["Contact", "/contact"],
          ].map(([name, url]) => (
            <Link
              key={url}
              href={url}
              aria-current={pathname === url || (url !== "/" && pathname.startsWith(`${url}/`)) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {name}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          {authUnavailable ? <button type="button" className="nav-auth-retry" title="Account service is temporarily unavailable. Click to retry." onClick={() => router.refresh()}>Account unavailable · Retry</button> : user ? (
            <div ref={accountRef} className="nav-account" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAccountPath(null); }} data-open={accountOpen} onKeyDown={event => { if (event.key === "Escape") { setAccountPath(null); event.currentTarget.querySelector<HTMLButtonElement>(".nav-account-toggle")?.focus(); } }}>
              <button type="button" className="nav-account-toggle" aria-expanded={accountOpen} aria-controls="account-menu" onClick={() => setAccountPath(accountOpen ? null : pathname)}><UserAvatar src={user.avatarUrl} name={user.name || "Your account"} size={26} /><span>My account</span>{hasUnread && !accountOpen && <span className="account-unread-dot" aria-label="Unread notifications" />}<ChevronDown size={13} /></button>
              <div className="nav-account-menu" id="account-menu" inert={!accountOpen} onClick={event => { if ((event.target as HTMLElement).closest("a")) setAccountPath(null); }}>
                <div className="nav-account-identity"><UserAvatar src={user.avatarUrl} name={user.name || "Your account"} size={42} /><div><small>Signed in as</small>{user.name && <strong>{user.name}</strong>}<span>{user.email}</span></div></div>
                <Link href={user.isAdmin ? "/admin" : "/dashboard"}>Dashboard</Link>
                {!user.isAdmin && <Link href="/notifications"><span className="notification-menu-label">Notifications{hasUnread && <span className="notification-unread-dot" aria-label="Unread notifications" />}</span></Link>}
                {!user.isAdmin && <Link href="/bookings">My reservations</Link>}
                <Link href={user.isAdmin ? "/admin/settings" : "/profile"}>Account settings</Link>
                <div className="nav-account-logout"><LogoutButton /></div>
              </div>
            </div>
          ) : <Link href="/login">Login</Link>}
          {!user && pathname !== "/" && (
            <Link href="/fleet" className="button small">
              Find Your Ride <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
        <button
          className="menu"
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}



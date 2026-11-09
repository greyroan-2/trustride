"use client";
import Link from "next/link";
import { reservationHref } from "@/lib/reservation-navigation";
import { useLayoutEffect, useRef } from "react";
import { Bell, ArrowRight, Check, Clock3, X } from "lucide-react";
import { useNotifications } from "./notification-provider";

export function NotificationInbox() {
  const { notifications, read, loading, error, markRead, refresh } = useNotifications();
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const resize = () => {
      const items = Array.from(list.children) as HTMLElement[];
      if (loading || error || items.length <= 5) {
        list.style.removeProperty("max-height");
        return;
      }
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      list.style.maxHeight = `${Math.ceil(items.slice(0, 5).reduce((height, item) => height + item.getBoundingClientRect().height, 0) + gap * 4)}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(list);
    Array.from(list.children).slice(0, 5).forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [notifications, loading, error]);
  const unread = notifications.filter(item => !read.includes(item.id)).length;
  return <div className="notification-inbox">
    <div className="notification-inbox-toolbar"><p>{unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're all caught up"}</p><button type="button" disabled={!unread} onClick={() => markRead(notifications.map(item => item.id))}>Mark all as read</button></div>
    <div ref={listRef} className={`notification-list ${!loading && !error && notifications.length > 5 ? "notification-list-scrollable" : ""}`} role="region" aria-label="Reservation notifications, newest first" tabIndex={!loading && !error && notifications.length > 5 ? 0 : undefined}>
    {error ? <div className="notice" role="status">{error} <button type="button" onClick={refresh}>Try again</button></div> : loading ? <p role="status">Loading notifications…</p> : notifications.length === 0 ? <div className="notification-empty"><Bell size={32} aria-hidden="true" /><h2>No reservation updates yet</h2><p>Updates will appear here when your request is pending, confirmed, delivered, or rejected.</p><Link href="/fleet">Explore the fleet →</Link></div> : notifications.map(item => {
      const isUnread = !read.includes(item.id);
      const Icon = item.status === "PENDING" ? Clock3 : ["CONFIRMED","DELIVERED"].includes(item.status) ? Check : X;
      return <Link className={`notification-item ${isUnread ? "notification-unread" : ""}`} href={reservationHref(item.bookingId, item.status)} key={item.id} onClick={() => markRead([item.id])}>
        <span className={`notification-status-icon notification-${item.status.toLowerCase()}`}><Icon size={20} aria-hidden="true" /></span>
        <div><h2>{item.title}{isUnread && <span className="notification-inline-dot" aria-label="Unread" />}</h2><p>{item.message}</p></div><ArrowRight size={18} aria-hidden="true" />
      </Link>;
    })}
    </div>
  </div>;
}



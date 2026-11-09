"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { reservationHref } from "@/lib/reservation-navigation";
import { Bell, X } from "lucide-react";
import type { ReservationNotification } from "@/lib/reservation-notifications";

type NotificationState = {
  notifications: ReservationNotification[]; read: string[]; loading: boolean; error: string;
  markRead: (ids: string[]) => void; refresh: () => void;
};
const Context = createContext<NotificationState>({ notifications: [], read: [], loading: true, error: "", markRead: () => {}, refresh: () => {} });
export const useNotifications = () => useContext(Context);
const storageKey = (id: string) => `trustride:notifications:read:${id}`;
function storedRead(userId: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ReservationNotification[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState<ReservationNotification | null>(null);
  const userId = useRef<string | null>(null);
  const announced = useRef(new Set<string>());
  const refreshRef = useRef<() => void>(() => {});
  const markRead = useCallback((ids: string[]) => {
    if (!userId.current) return;
    const merged = [...new Set([...storedRead(userId.current), ...ids])];
    setRead(merged);
    try { localStorage.setItem(storageKey(userId.current), JSON.stringify(merged)); } catch { /* Keep in-memory read state if storage is unavailable. */ }
    setAlert(current => current && ids.includes(current.id) ? null : current);
  }, []);
  useEffect(() => {
    let disposed = false;
    let fetching = false;
    const controller = new AbortController();
    async function refresh() {
      if (fetching) return;
      fetching = true;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store", signal: controller.signal });
        if (disposed) return;
        if (response.status === 401) {
          userId.current = null;
          announced.current.clear();
          setNotifications([]); setRead([]); setAlert(null); setError("");
          return;
        }
        if (!response.ok) throw new Error("Notifications are temporarily unavailable.");
        const data: { userId: string; notifications: ReservationNotification[] } = await response.json();
        if (disposed) return;
        const sameUser = userId.current === data.userId;
        if (!sameUser) {
          announced.current.clear();
          userId.current = data.userId;
          setAlert(null);
        }
        const saved = storedRead(data.userId);
        setRead(previous => [...new Set([...saved, ...(sameUser ? previous : [])])]);
        const fresh = data.notifications.filter(item => !saved.includes(item.id) && !announced.current.has(item.id));
        data.notifications.forEach(item => announced.current.add(item.id));
        setNotifications(data.notifications);
        setError("");
        if (fresh.length) setAlert(fresh[0]);
      } catch {
        if (!disposed) setError("Notifications are temporarily unavailable. Please try again.");
      } finally {
        fetching = false;
        if (!disposed) setLoading(false);
      }
    }
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15000);
    const onFocus = () => { void refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (userId.current && (event.key === storageKey(userId.current) || event.key === null)) setRead(storedRead(userId.current));
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => { disposed = true; controller.abort(); window.clearInterval(poll); window.removeEventListener("focus", onFocus); window.removeEventListener("storage", onStorage); };
  }, []);
  useEffect(() => {
    if (!alert) return;
    const timeout = window.setTimeout(() => setAlert(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [alert]);
  return <Context.Provider value={{ notifications, read, loading, error, markRead, refresh: () => refreshRef.current() }}>
    {children}
    {alert && <div className="reservation-notification-alert" role="status" aria-live="polite">
      <Bell size={21} aria-hidden="true" />
      <div><strong>{alert.title}</strong><p>{alert.message}</p><Link href={reservationHref(alert.bookingId, alert.status)} onClick={() => markRead([alert.id])}>View reservation →</Link></div>
      <button type="button" aria-label="Dismiss notification alert" onClick={() => setAlert(null)}><X size={17} /></button>
    </div>}
  </Context.Provider>;
}



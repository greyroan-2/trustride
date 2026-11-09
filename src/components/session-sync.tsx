"use client";

import { startTransition, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function SessionSync() {
  const pathname = usePathname();
  const previousUser = useRef<string | null | undefined>(undefined);
  const router = useRouter();
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const client = createBrowserClient(url, key);
    const tabs = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("trustride-auth-ui") : null;
    let token: string | null = null;
    let channel: RealtimeChannel | null = null;
    let channelUser: string | null = null;
    let checking = false;
    let disposed = false;
    const controller = new AbortController();

    async function checkSession(force = false) {
      if (disposed || checking || !token || (!force && document.visibilityState !== "visible")) return;
      checking = true;
      const checkedToken = token;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const state = await response.json();
        if (!disposed && token === checkedToken && state.active === false) {
          await client.auth.signOut({ scope: "local" });
          if (!disposed) window.location.replace("/");
        }
      } catch {
        // Connectivity failures are retried rather than treated as a logout.
      } finally { checking = false; }
    }

    async function listen(userId: string, accessToken: string) {
      await client.realtime.setAuth(accessToken);
      if (disposed || token !== accessToken || channelUser === userId) return;
      if (channel) void client.removeChannel(channel);
      channelUser = userId;
      channel = client.channel(`trustride:auth:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "signed_out" }, () => { void checkSession(true); })
        .subscribe(status => {
          // Also close the gap between initial validation and WebSocket subscription.
          if (status === "SUBSCRIBED") void checkSession(true);
        });
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      const wasSignedIn = Boolean(token);
      token = session?.access_token ?? null;
      const userId = session?.user.id ?? null;
      // Token rotation is routine and must never trigger cross-tab reloads.
      if (event === "SIGNED_IN" && previousUser.current !== undefined && previousUser.current !== userId) tabs?.postMessage("session_changed");
      previousUser.current = userId;
      if (event === "SIGNED_OUT" && wasSignedIn && !disposed) {
        tabs?.postMessage("session_changed");
        window.location.replace(pathname === "/reset-password" ? "/login?message=Password+updated.+Sign+in+with+your+new+password." : "/");
      }
      if (session) {
        // Run outside Supabase's auth callback lock.
        queueMicrotask(() => { if (!disposed) void listen(session.user.id, session.access_token); });
      }
    });

    if (tabs) tabs.onmessage = event => {
      if (event.data === "session_changed" && !disposed) {
        void checkSession(true);
        startTransition(() => router.refresh());
      }
    };
    const resume = () => { void checkSession(true); };
    const timer = window.setInterval(() => { void checkSession(); }, 10000);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    void client.auth.getSession().then(({ data }) => {
      if (disposed) return;
      token = data.session?.access_token ?? null;
      previousUser.current = data.session?.user.id ?? null;
      if (data.session) void listen(data.session.user.id, data.session.access_token);
      void checkSession();
    });
    return () => {
      disposed = true;
      controller.abort();
      subscription.unsubscribe();
      if (channel) void client.removeChannel(channel);
      tabs?.close();
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [pathname, router]);
  return null;
}

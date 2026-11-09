"use client";
import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

export function BookingRefresh() {
  const router = useRouter();
  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 30000) return;
      if (document.activeElement?.matches("input, textarea, select")) return;
      lastRefresh = Date.now();
      startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [router]);
  return null;
}

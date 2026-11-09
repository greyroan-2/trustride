"use client";

import { useEffect } from "react";

const storageKey = "trustride-pending-save";

export function SaveFeedback() {
  useEffect(() => {
    function trackSave(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const button = event.submitter ?? form.querySelector('button[type="submit"], button:not([type])');
      const label = button?.textContent?.trim() ?? "";
      try {
        sessionStorage.removeItem(storageKey);
        if (!/^save\b/i.test(label)) return;
        const data = new FormData(form);
        sessionStorage.setItem(storageKey, JSON.stringify({
          path: location.pathname,
          action: String(data.get("action") ?? ""),
          id: String(data.get("id") ?? ""),
          label,
          time: Date.now(),
        }));
      } catch { /* Saving still works when browser storage is unavailable. */ }
    }
    document.addEventListener("submit", trackSave, true);
    return () => document.removeEventListener("submit", trackSave, true);
  }, []);
  return null;
}

export function pulseSuccessfulSave() {
  try {
    const raw = sessionStorage.getItem(storageKey);
    sessionStorage.removeItem(storageKey);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.path !== location.pathname || Date.now() - saved.time > 60000) return;
    for (const form of document.querySelectorAll("form")) {
      const data = new FormData(form);
      if (String(data.get("action") ?? "") !== saved.action || String(data.get("id") ?? "") !== saved.id) continue;
      const button = Array.from(form.querySelectorAll("button")).find(item => item.textContent?.trim() === saved.label);
      if (!button) continue;
      for (let parent = button.parentElement; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
      }
      button.classList.remove("save-success-pulse");
      requestAnimationFrame(() => button.classList.add("save-success-pulse"));
      button.addEventListener("animationend", () => button.classList.remove("save-success-pulse"), { once: true });
      break;
    }
  } catch { /* Feedback must never interrupt the saved result. */ }
}

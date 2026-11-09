"use client";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, X } from "lucide-react";
const subscribe = () => () => {};

export function ErrorPopup({ message, onDismiss, title = "Please check your submission" }: { message: string; onDismiss: () => void; title?: string }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(<div className="booking-error-notification" role="alert" aria-atomic="true"><span className="booking-error-notification-icon"><AlertCircle size={22} /></span><div><strong>{title}</strong><p>{message}</p></div><button type="button" aria-label="Dismiss error notification" onClick={onDismiss}><X size={17} /></button></div>, document.body);
}


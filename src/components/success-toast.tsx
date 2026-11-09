"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";
import { pulseSuccessfulSave } from "@/components/save-feedback";

const subscribe = () => () => {};

export function SuccessToast({ message }: { message: string }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (/saved/i.test(message)) pulseSuccessfulSave();
  }, [message]);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!mounted || !visible) return null;
  return createPortal(
    <div className="success-toast" role="status" aria-live="polite">
      <span className="success-toast-icon"><CheckCircle2 size={22} /></span>
      <div><strong>Success</strong><p>{message}</p></div>
      <button type="button" className="success-toast-close" aria-label="Dismiss success message" onClick={() => setVisible(false)}><X size={17} /></button>
      <span className="success-toast-progress" aria-hidden="true" />
    </div>, document.body,
  );
}

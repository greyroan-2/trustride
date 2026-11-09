"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";

export function LogoutButton({ className = "", showIcon = false }: { className?: string; showIcon?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className} onClick={() => setOpen(true)}>
      {showIcon && <LogOut size={16} />} Sign out
    </button>
    {open && createPortal(<LogoutDialog onClose={() => setOpen(false)} />, document.body)}
  </>;
}

function LogoutDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return (
    <dialog ref={dialog} className="logout-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
      <span className="logout-dialog-icon"><LogOut size={25} /></span>
      <h2 id={titleId}>Sign out of TrustRide?</h2>
      <p id={descriptionId}>You’ll be signed out on all browsers and devices. You can sign in again anytime.</p>
      {error && <p className="logout-dialog-error" role="alert">{error}</p>}
      <div className="logout-dialog-actions">
        <button type="button" className="logout-dialog-cancel" autoFocus disabled={pending} onClick={onClose}>Stay signed in</button>
        <button type="button" className="logout-dialog-confirm" disabled={pending} onClick={() => {
          setError("");
          startTransition(async () => {
            try { await logout(); onClose(); }
            catch { setError("Could not sign out. Please try again."); }
          });
        }}>{pending ? "Signing out…" : "Sign out"}</button>
      </div>
    </dialog>
  );
}

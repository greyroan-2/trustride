"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Feedback = { field: Field; message: string; left: number; top: number; above: boolean; width: number };
function messageFor(field: Field) {
  if (field.validity.valueMissing) {
    if (field instanceof HTMLInputElement && field.type === "file") return "Please select a file to upload.";
    if (field instanceof HTMLInputElement && field.type === "checkbox") return "Please confirm this before continuing.";
    if (field instanceof HTMLSelectElement) return "Please select an option.";
    return "Please complete this required field.";
  }
  return field.validationMessage;
}
export function ValidationFeedback() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const id = useId();
  const pathname = usePathname();
  const dismissFeedback = useRef<() => void>(() => {});
  useEffect(() => {
    let field: Field | null = null;
    let batch = false;
    let batchTimer: ReturnType<typeof setTimeout> | undefined;
    let originalInvalid: string | null = null;
    let originalDescription: string | null = null;
    function clearAttributes() {
      if (!field) return;
      if (originalInvalid === null) field.removeAttribute("aria-invalid"); else field.setAttribute("aria-invalid", originalInvalid);
      if (originalDescription === null) field.removeAttribute("aria-describedby"); else field.setAttribute("aria-describedby", originalDescription);
    }
    function dismiss() { clearAttributes(); field = null; setFeedback(null); }
    dismissFeedback.current = dismiss;
    function position() {
      if (!field) return;
      if (!field.isConnected) { dismiss(); return; }
      const rect = field.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 32);
      const above = rect.bottom + 96 > window.innerHeight;
      setFeedback({ field, message: messageFor(field), width, left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), top: above ? Math.max(16, rect.top - 10) : rect.bottom + 10, above });
    }
    function invalid(event: Event) {
      if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement)) return;
      event.preventDefault();
      if (batch) return;
      batch = true;
      batchTimer = setTimeout(() => { batch = false; }, 0);
      clearAttributes();
      field = event.target;
      originalInvalid = field.getAttribute("aria-invalid");
      originalDescription = field.getAttribute("aria-describedby");
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", [originalDescription, id].filter(Boolean).join(" "));
      field.focus();
      position();
    }
    function input(event: Event) {
      if (event.target !== field || !field) return;
      if (field.validity.valid) dismiss(); else position();
    }
    function keydown(event: KeyboardEvent) { if (event.key === "Escape") dismiss(); }
    function pointerdown(event: PointerEvent) {
      if (field && event.target instanceof Element && event.target !== field && !event.target.closest(".validation-feedback")) dismiss();
    }
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", input, true);
    document.addEventListener("change", input, true);
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      clearAttributes();
      clearTimeout(batchTimer);
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", input, true);
      document.removeEventListener("change", input, true);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [id, pathname]);
  if (!feedback || !feedback.field.isConnected) return null;
  return createPortal(<div className={`validation-feedback${feedback.above ? " above" : ""}`} style={{ left: feedback.left, top: feedback.top, width: feedback.width }} role="alert" id={id}>
    <AlertCircle size={18} aria-hidden="true" /><span>{feedback.message}</span><button type="button" aria-label="Dismiss validation message" onClick={() => dismissFeedback.current()}><X size={14} /></button>
  </div>, document.body);
}

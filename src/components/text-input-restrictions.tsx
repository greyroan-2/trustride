"use client";
import { useEffect, useState } from "react";
import { containsEmoji, emojiInputMessage } from "@/lib/text-input";

type TextField = HTMLInputElement | HTMLTextAreaElement;
function textField(target: EventTarget | null): TextField | null {
  if (target instanceof HTMLTextAreaElement) return target;
  return target instanceof HTMLInputElement && ["text", "search", "email", "tel", "url", "password"].includes(target.type) ? target : null;
}
export function TextInputRestrictions() {
  const [notice, setNotice] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function notify() { setNotice(true); clearTimeout(timer); timer = setTimeout(() => setNotice(false), 3500); }
    function beforeInput(event: Event) {
      const input = event as InputEvent;
      if (textField(event.target) && input.data && containsEmoji(input.data) && event.cancelable && !input.isComposing) { event.preventDefault(); notify(); }
    }
    function paste(event: ClipboardEvent) {
      if (textField(event.target) && containsEmoji(event.clipboardData?.getData("text") ?? "")) { event.preventDefault(); notify(); }
    }
    function validate(field: TextField) {
      if (containsEmoji(field.value)) { field.setCustomValidity(emojiInputMessage); return false; }
      if (field.validationMessage === emojiInputMessage) field.setCustomValidity("");
      return true;
    }
    function input(event: Event) {
      const field = textField(event.target);
      if (field && !(event as InputEvent).isComposing && !validate(field)) notify();
    }
    function submit(event: Event) {
      if (!(event.target instanceof HTMLFormElement)) return;
      for (const element of event.target.elements) {
        const field = textField(element);
        if (field && !validate(field)) { event.preventDefault(); field.reportValidity(); notify(); break; }
      }
    }
    document.addEventListener("beforeinput", beforeInput, true);
    document.addEventListener("paste", paste, true);
    document.addEventListener("input", input, true);
    document.addEventListener("compositionend", input, true);
    document.addEventListener("submit", submit, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("beforeinput", beforeInput, true);
      document.removeEventListener("paste", paste, true);
      document.removeEventListener("input", input, true);
      document.removeEventListener("compositionend", input, true);
      document.removeEventListener("submit", submit, true);
    };
  }, []);
  return notice ? <div className="text-input-restriction-notice" role="status">{emojiInputMessage}</div> : null;
}

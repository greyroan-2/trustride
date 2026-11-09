"use client";
import { useState } from "react";
import { ErrorPopup } from "./error-popup";

export function AdminActionAlert({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return <ErrorPopup title="Action needs attention" message={message} onDismiss={() => setDismissed(true)} />;
}

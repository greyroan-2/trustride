"use client";
import { useId, useState, useRef, type ReactNode, type KeyboardEvent } from "react";
import { LayoutList, MapPin, Wallet, Settings2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { adminMutation } from "@/app/actions/admin";
import { SubmitButton } from "./submit-button";
import { canDeleteBookingRequest } from "@/lib/request-policy";

const tabs = [{ label: "Overview", Icon: LayoutList }, { label: "Travel & documents", Icon: MapPin }, { label: "Payment", Icon: Wallet }, { label: "Actions", Icon: Settings2 }];
export function RequestSections({ sections }: { sections: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const nav = useRef<HTMLDivElement>(null);
  function navigate(event: KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault(); setActive(next);
    nav.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }
  return <><div className="request-tabs" role="tablist" aria-label="Request details" ref={nav}>{tabs.map(({ label, Icon }, index) => <button type="button" key={label} role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => navigate(event, index)}><Icon size={16} />{label}</button>)}</div>{sections.map((section, index) => <div className="request-tab-panel" key={index} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} tabIndex={0}>{section}</div>)}</>;
}
export function DeleteRequestButton({ id, reference, status }: { id: string; reference: string; status: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  if (!canDeleteBookingRequest(status)) return <p className="request-muted">Delete is available only for cancelled, confirmed, or rejected requests.</p>;
  return <><button type="button" className="request-delete-button" onClick={() => dialog.current?.showModal()}><Trash2 size={16} />Delete request</button><dialog ref={dialog} className="request-delete-dialog" aria-labelledby={titleId}><div className="request-dialog-heading"><h3 id={titleId}>Delete this request?</h3><button type="button" aria-label="Close delete dialog" onClick={() => dialog.current?.close()}><X size={20} /></button></div><p><strong>{reference}</strong> and its booking details and payment records will be permanently removed.</p>{status === "CONFIRMED" && <p className="request-delete-warning">This is a confirmed reservation. Deleting it will also free the car&apos;s reserved dates.</p>}<p>This action cannot be undone. An admin audit record will remain.</p><form action={adminMutation}><input type="hidden" name="action" value="booking-delete" /><input type="hidden" name="id" value={id} /><input type="hidden" name="confirmDelete" value="yes" /><div className="request-dialog-buttons"><button type="button" className="button outline" onClick={() => dialog.current?.close()}>Keep request</button><SubmitButton>Delete permanently</SubmitButton></div></form></dialog></>;
}

export function RequestTableRow({ href, selected, children }: { href: string; selected: boolean; children: ReactNode }) {
  const router = useRouter();
  return <tr className={selected ? "selected" : undefined} onClick={event => { if (!(event.target as Element).closest("a, button")) router.push(href, { scroll: false }); }}>{children}</tr>;
}

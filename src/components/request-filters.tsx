"use client";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestListHref } from "@/lib/request-pagination";

export function RequestFilters({ query, status }: { query: string; status: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const input = form.current?.elements.namedItem("q");
    const select = form.current?.elements.namedItem("status");
    if (input instanceof HTMLInputElement && document.activeElement !== input) input.value = query;
    if (select instanceof HTMLSelectElement) select.value = status;
  }, [query, status]);
  function apply(immediate = false) {
    if (timer.current) clearTimeout(timer.current);
    const navigate = () => {
      if (!form.current) return;
      const data = new FormData(form.current);
      startTransition(() => router.replace(requestListHref(String(data.get("q") ?? ""), String(data.get("status") ?? "")), { scroll: false }));
    };
    if (immediate) navigate(); else timer.current = setTimeout(navigate, 350);
  }
  return <form ref={form} className="request-filters request-table-filters request-auto-filters" aria-busy={pending} onSubmit={event => { event.preventDefault(); apply(true); }}>
    <label>Find a request<input name="q" type="search" maxLength={100} placeholder="Transaction, name, or vehicle" defaultValue={query} onChange={() => apply()} /></label>
    <label>Status<select name="status" defaultValue={status} onChange={() => apply(true)}><option value="">All statuses</option>{["PENDING", "CONFIRMED", "DELIVERED", "REJECTED", "CANCELLED", "COMPLETED"].map(value => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label>
    <div className="request-filter-actions"><span className="request-filter-progress" role="status">{pending ? "Updating…" : "Filters apply automatically"}</span><button type="button" className="request-reset-filters" onClick={() => { if (timer.current) clearTimeout(timer.current); form.current?.reset(); const input = form.current?.elements.namedItem("q"); const select = form.current?.elements.namedItem("status"); if (input instanceof HTMLInputElement) input.value = ""; if (select instanceof HTMLSelectElement) select.value = ""; startTransition(() => router.replace("/admin/requests", { scroll: false })); }}>Reset</button></div>
  </form>;
}

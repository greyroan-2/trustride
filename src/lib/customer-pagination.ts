export function customerListHref(query: string, page = 1, customer?: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q",query.trim().slice(0,100));
  if (page > 1) params.set("page",String(page));
  if (customer) params.set("customer",customer);
  return `/admin/customers${params.size?`?${params}`:""}`;
}

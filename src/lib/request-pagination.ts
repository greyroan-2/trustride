export const REQUEST_PAGE_SIZE = 10;
export function requestPagination(total: number, requestedPage?: string) {
  const pages = Math.max(1, Math.ceil(total / REQUEST_PAGE_SIZE));
  const parsed = Number(requestedPage ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, pages) : 1;
  return { page, pages, skip: (page - 1) * REQUEST_PAGE_SIZE, take: REQUEST_PAGE_SIZE };
}
export function requestListHref(query: string, status: string, page = 1, request?: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim().slice(0, 100));
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  if (request) params.set("request", request);
  return `/admin/requests${params.size ? `?${params}` : ""}`;
}

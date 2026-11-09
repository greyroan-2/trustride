import { test } from "node:test";
import assert from "node:assert/strict";
import { requestListHref, requestPagination } from "../src/lib/request-pagination";

test("transaction pages contain no more than ten records and clamp invalid pages", () => {
  assert.deepEqual(requestPagination(25, "2"), { page: 2, pages: 3, skip: 10, take: 10 });
  assert.deepEqual(requestPagination(25, "999"), { page: 3, pages: 3, skip: 20, take: 10 });
  assert.deepEqual(requestPagination(0), { page: 1, pages: 1, skip: 0, take: 10 });
  for (const page of ["-1", "abc", "1.5", "Infinity"]) assert.equal(requestPagination(25, page).page, 1);
  assert.equal(requestPagination(10).pages, 1);
  assert.equal(requestPagination(11).pages, 2);
});
test("pagination and row selection retain filters while filter changes reset the page", () => {
  const href = requestListHref("Veloz & Innova", "PENDING", 2, "booking-id");
  const url = new URL(href, "http://localhost");
  assert.equal(url.searchParams.get("q"), "Veloz & Innova");
  assert.equal(url.searchParams.get("status"), "PENDING");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("request"), "booking-id");
  assert.equal(requestListHref("", ""), "/admin/requests");
  assert.equal(new URL(requestListHref("Veloz", "PENDING"), "http://localhost").searchParams.has("page"), false);
});

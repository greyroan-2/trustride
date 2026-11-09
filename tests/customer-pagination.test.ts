import { test } from "node:test";
import assert from "node:assert/strict";
import { customerListHref } from "../src/lib/customer-pagination";
test("customer pagination preserves search and selected customer without leaking into request URLs",()=>{
 assert.equal(customerListHref("",1),"/admin/customers");
 const url=new URL(customerListHref("Jane Doe",2,"customer-id"),"https://example.test");
 assert.equal(url.pathname,"/admin/customers");assert.equal(url.searchParams.get("q"),"Jane Doe");assert.equal(url.searchParams.get("page"),"2");assert.equal(url.searchParams.get("customer"),"customer-id");
});

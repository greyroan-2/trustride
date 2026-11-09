import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingOwnerFilter } from "../src/lib/resource-access";
test("client document queries stay owner-scoped and only a verified admin can inspect all bookings",()=>{
 assert.deepEqual(bookingOwnerFilter({id:"client-a",role:"CLIENT"}),{customerId:"client-a"});
 assert.deepEqual(bookingOwnerFilter({id:"client-b",role:"CLIENT"}),{customerId:"client-b"});
 assert.deepEqual(bookingOwnerFilter({id:"admin",role:"ADMIN"}),{});
 assert.deepEqual(bookingOwnerFilter({id:"client-a",role:"unknown"}),{customerId:"client-a"});
});

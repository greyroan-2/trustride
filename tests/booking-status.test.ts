import {test} from "node:test";
import assert from "node:assert/strict";
import {canTransitionBooking,isDeliveryDue,bookingPickupAt} from "../src/lib/booking-status";
test("only confirmed bookings can become delivered and only delivered can complete",()=>{
 assert.equal(canTransitionBooking("PENDING","CONFIRMED"),true);
 for(const status of ["PENDING","REJECTED","CANCELLED","COMPLETED"])assert.equal(canTransitionBooking(status,"DELIVERED"),false);
 assert.equal(canTransitionBooking("CONFIRMED","DELIVERED"),true);
 assert.equal(canTransitionBooking("CONFIRMED","COMPLETED"),false);
 assert.equal(canTransitionBooking("DELIVERED","COMPLETED"),true);
 assert.equal(canTransitionBooking("DELIVERED","CANCELLED"),false);
});
test("delivery uses the scheduled Manila pickup time and never advances pending requests",()=>{
 const before=new Date("2026-11-10T00:59:59Z"),at=new Date("2026-11-10T01:00:00Z");
 assert.equal(isDeliveryDue("CONFIRMED","2026-11-10","09:00",before),false);
 assert.equal(isDeliveryDue("CONFIRMED","2026-11-10","09:00",at),true);
 assert.equal(isDeliveryDue("PENDING","2026-11-10","09:00",at),false);
 assert.equal(bookingPickupAt("2026-11-10","00:00").toISOString(),"2026-11-09T16:00:00.000Z");
 assert.equal(bookingPickupAt("2026-11-10").toISOString(),"2026-11-10T01:00:00.000Z");
});

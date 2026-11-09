const assert=require("node:assert/strict");
const {randomUUID}=require("node:crypto");
// The caller owns a transaction and MUST roll it back. No fixtures are retained.
module.exports=async function verifyDelivery(client){
 const customer=randomUUID(),model=randomUUID(),vehicle=randomUUID();
 await client.query('INSERT INTO "UserProfile" (id,email) VALUES ($1,$2)',[customer,`ci-${customer}@example.invalid`]);
 await client.query('INSERT INTO "VehicleModel" (id,slug,name,features,description) VALUES ($1,$2,$3,$4,$5)',[model,`ci-${model}`,"Delivery lifecycle test",[],"Temporary verification fixture"]);
 await client.query('INSERT INTO "Vehicle" (id,"modelId","unitCode") VALUES ($1,$2,$3)',[vehicle,model,`ci-${vehicle}`]);
 const make=async(days)=>{const id=randomUUID();await client.query(`INSERT INTO "Booking" (id,reference,"customerId","vehicleId","startDate","endDate","dailyMinor","feeMinor","depositMinor","totalMinor",currency) VALUES ($1,$2,$3,$4,(now() AT TIME ZONE 'Asia/Manila')::date+$5::integer,(now() AT TIME ZONE 'Asia/Manila')::date+$5::integer+1,10000,0,0,10000,'PHP')`,[id,`ci-${id}`,customer,vehicle,days]);await client.query('INSERT INTO "BookingWorkflow" ("bookingId",data) VALUES ($1,$2)',[id,{schedule:{pickupTime:"09:00"}}]);return id;};
 const due=await make(-2),pending=await make(-2),future=await make(2);
 await client.query(`UPDATE "Booking" SET status='CONFIRMED' WHERE id=ANY($1::uuid[])`,[[due,future]]);
 const rejects=async(sql,params,code)=>{await client.query("SAVEPOINT invalid_transition");await assert.rejects(client.query(sql,params),error=>error.code===code);await client.query("ROLLBACK TO SAVEPOINT invalid_transition");};
 await rejects(`UPDATE "Booking" SET status='DELIVERED' WHERE id=$1`,[pending],"P0001");
 await rejects(`UPDATE "Booking" SET status='COMPLETED' WHERE id=$1`,[due],"P0001");
 await rejects(`UPDATE "Booking" SET status='DELIVERED' WHERE id=$1`,[future],"P0001");
 await client.query("SELECT trustride_private.advance_due_deliveries()");
 const rows=(await client.query('SELECT id,status,"deliveredAt" FROM "Booking" WHERE id=ANY($1::uuid[])',[[due,pending,future]])).rows;
 assert.equal(rows.find(row=>row.id===due).status,"DELIVERED");assert.ok(rows.find(row=>row.id===due).deliveredAt);
 assert.equal(rows.find(row=>row.id===pending).status,"PENDING");assert.equal(rows.find(row=>row.id===future).status,"CONFIRMED");
 assert.equal((await client.query('SELECT count(*)::int AS n FROM "PaymentRecord" WHERE "bookingId"=$1',[due])).rows[0].n,0);
 await rejects(`UPDATE "Booking" SET status='CONFIRMED' WHERE id=$1`,[pending],"23P01");
 await client.query(`UPDATE "Booking" SET status='COMPLETED' WHERE id=$1`,[due]);
 assert.equal((await client.query('SELECT status FROM "Booking" WHERE id=$1',[due])).rows[0].status,"COMPLETED");
};

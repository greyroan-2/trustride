const { Client } = require("pg");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const connection = new URL(process.env.DATABASE_URL || "postgres://invalid");
if (process.env.CI_TEST_DATABASE !== "true" || !["localhost", "127.0.0.1", "postgres"].includes(connection.hostname) || !connection.pathname.endsWith("_test")) throw new Error("This script is restricted to an isolated local CI test database.");
(async () => {
 const client = new Client({connectionString:connection.toString()}); await client.connect();
 try {
  if (process.argv[2] === "bootstrap") { await client.query(fs.readFileSync("scripts/ci-bootstrap.sql","utf8")); return; }
  await client.query("BEGIN");
  const id = require("node:crypto").randomUUID();
  const injection = "Robert'); DROP TABLE public.\"Testimonial\"; --";
  await client.query('INSERT INTO "Testimonial" (id, author, content, rating) VALUES ($1,$2,$3,$4)',[id,injection,"A verified CI example.",5]);
  const row = (await client.query('SELECT author, rating FROM "Testimonial" WHERE id=$1',[id])).rows[0];
  assert.equal(row.author,injection); assert.equal(row.rating,5);
  for(const invalid of [0,6]) {
   await client.query("SAVEPOINT invalid_rating");
   await assert.rejects(client.query('UPDATE "Testimonial" SET rating=$1 WHERE id=$2',[invalid,id]),{code:"23514"});
   await client.query("ROLLBACK TO SAVEPOINT invalid_rating");
  }
  await client.query("SAVEPOINT private_data");
  await client.query("SET LOCAL ROLE authenticated");
  await assert.rejects(client.query('SELECT * FROM "UserProfile"'),{code:"42501"});
  await client.query("ROLLBACK TO SAVEPOINT private_data");
  await require("./verify-delivery.cjs")(client);
  await client.query("ROLLBACK"); console.log("Database constraints, parameterization, and direct Data API access gates passed.");
 } finally { await client.end(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});

import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryRateLimiter, RateLimitError, enforceRateLimit } from "../src/lib/rate-limit";
test("rate limits isolate accounts and reset at expiry", () => {
  const limiter = new MemoryRateLimiter();
  limiter.consume("a",2,1000,0); limiter.consume("a",2,1000,1);
  assert.throws(()=>limiter.consume("a",2,1000,2),RateLimitError);
  limiter.consume("b",2,1000,2); limiter.consume("a",2,1000,1000);
});
test("rate-limit memory is bounded and expired entries are reclaimed", () => {
  const limiter=new MemoryRateLimiter(1);limiter.consume("a",1,1000,0);
  assert.throws(()=>limiter.consume("b",1,1000,1),RateLimitError);
  limiter.consume("b",1,1000,1000);
});

test("distributed limits use expiring atomic counters and fail closed", async () => {
 const keys=["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN","REQUIRE_DISTRIBUTED_RATE_LIMIT"];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 const originalFetch=globalThis.fetch;
 try {
  process.env.UPSTASH_REDIS_REST_URL="https://limiter.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN="test-only-token";
  globalThis.fetch=async (_input,init)=>{
   const command=JSON.parse(String(init?.body));
   assert.equal(command[0],"EVAL");assert.equal(command[command.length-1],"60000");assert.ok(!command[3].includes("private-user-id"));
   return Response.json({result:[1,60000]});
  };
  await enforceRateLimit("scan","private-user-id",2);
  globalThis.fetch=async()=>Response.json({result:[3,1200]});
  await assert.rejects(enforceRateLimit("scan","private-user-id",2),(error: unknown)=>error instanceof RateLimitError && error.retryAfter===2 && !error.unavailable);
  globalThis.fetch=async()=>{throw new Error("Backend unavailable");};
  await assert.rejects(enforceRateLimit("scan","private-user-id",2),(error: unknown)=>error instanceof RateLimitError && error.unavailable);
  delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT="true";
  await assert.rejects(enforceRateLimit("scan","private-user-id",2),(error: unknown)=>error instanceof RateLimitError && error.unavailable);
 } finally {
  globalThis.fetch=originalFetch;
  for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
 }
});

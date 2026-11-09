import { test } from "node:test";
import assert from "node:assert/strict";
import { trustedClientIp, isSameOriginMutation, readSmallJson } from "../src/lib/request-security";
import { contentSecurityPolicy } from "../src/lib/content-security-policy";
test("forwarded IP is used only with a configured trusted ingress header",()=>{
 const headers=new Headers({"x-forwarded-for":"1.2.3.4", "x-real-ip":"192.0.2.1"});
 assert.equal(trustedClientIp(headers),"unidentified");assert.equal(trustedClientIp(headers,"x-real-ip"),"192.0.2.1");
 assert.equal(trustedClientIp(new Headers({"x-real-ip":"invalid"}),"x-real-ip"),"unidentified");
});
test("unsafe requests require the exact site origin",()=>{
 const url="https://trustride.example/api/quote";
 assert.equal(isSameOriginMutation(new Headers({origin:"https://trustride.example"}),url),true);
 for(const origin of ["https://trustride.example.attacker.test","null","http://trustride.example"]) assert.equal(isSameOriginMutation(new Headers({origin}),url),false);
 assert.equal(isSameOriginMutation(new Headers(),url),false);
 assert.equal(isSameOriginMutation(new Headers({origin:"https://trustride.example","sec-fetch-site":"cross-site"}),url),false);
});
test("JSON reads enforce actual size even without content-length",async()=>{
 const request=(body:string)=>new Request("https://example.test",{method:"POST",headers:{"content-type":"application/json"},body});
 assert.deepEqual(await readSmallJson(request('{"ok":true}')),{ok:true});
 await assert.rejects(readSmallJson(request(JSON.stringify({payload:"x".repeat(20000)}))));
});
test("production CSP requires per-request script nonces and disables executable embeds",()=>{
 const csp=contentSecurityPolicy("unique-test-nonce",true);
 assert.match(csp,/nonce-unique-test-nonce/);assert.match(csp,/object-src 'none'/);assert.match(csp,/frame-ancestors 'none'/);assert.ok(!csp.includes("'unsafe-eval'"));assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"));
});

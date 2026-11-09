import { test } from "node:test";
import assert from "node:assert/strict";
import { passwordResetSchema } from "../src/lib/password-reset";
import { authCallbackTarget, safeNext, isGuestOnlyAuthPage } from "../src/lib/auth-redirect";
test("password reset accepts matching strong passwords and rejects invalid confirmation",()=>{
 assert.equal(passwordResetSchema.safeParse({password:"a-long-password",confirmPassword:"a-long-password"}).success,true);
 for(const data of [{password:"short",confirmPassword:"short"},{password:"a-long-password",confirmPassword:"different-password"},{password:"x".repeat(129),confirmPassword:"x".repeat(129)},{password:null,confirmPassword:null}]) assert.equal(passwordResetSchema.safeParse(data).success,false);
});
test("recovery callbacks target the new-password form and cannot redirect off site",()=>{
 assert.equal(authCallbackTarget("/profile",true),"/reset-password");
 assert.equal(authCallbackTarget("/reset-password",false),"/reset-password");
 assert.equal(authCallbackTarget("/dashboard",false),"/dashboard");
 for(const next of ["https://other.example/reset-password","//other.example/reset-password","/unlisted",null]) assert.equal(safeNext(next),"/fleet");
});

test("signed-in users skip guest authentication pages while recovery remains accessible",()=>{
 for(const slug of ["login","register","forgot-password"]) assert.equal(isGuestOnlyAuthPage(slug),true);
 for(const slug of ["reset-password","profile","testimonials"]) assert.equal(isGuestOnlyAuthPage(slug),false);
});

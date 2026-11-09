import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthConnectionError } from "../src/lib/auth-errors";

test("retryable auth errors and network failures are recognized", () => {
  assert.equal(isAuthConnectionError({ name: "AuthRetryableFetchError", message: "fetch failed" }), true);
  assert.equal(isAuthConnectionError(new TypeError("fetch failed")), true);
  assert.equal(isAuthConnectionError({ cause: { code: "ECONNRESET" } }), true);
  assert.equal(isAuthConnectionError({ status: 503 }), true);
});
test("invalid credentials and programming errors are not treated as outages", () => {
  assert.equal(isAuthConnectionError({ status: 401, name: "AuthApiError" }), false);
  assert.equal(isAuthConnectionError(new TypeError("Cannot read properties of undefined")), false);
  assert.equal(isAuthConnectionError({ code: "P2002" }), false);
  assert.equal(isAuthConnectionError(null), false);
});

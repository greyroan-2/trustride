import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReceiptText } from "../src/lib/receipt-parser";

test("bank receipt extracts transfer amount rather than fees or account numbers", () => {
  assert.deepEqual(parseReceiptText("Transfer Successful!\nPHP 240.00\nAccount No. 123456789\nTransfer Amount PHP 240.00\nTransfer Fee FREE\nTotal Amount PHP 240.00\nReference Number BC55000001234567890"), { amountMinor: 24000, reference: "BC55000001234567890" });
});
test("GCash receipt normalizes grouped references and stops before the date", () => {
  assert.deepEqual(parseReceiptText("Express Send\n+63 967 514 6510\nAmount 1.00\nTotal Amount Sent ₱1.00\nRef No. 5046 987 490409 Nov 07, 2026 1:56 PM"), { amountMinor: 100, reference: "5046987490409" });
});
test("currency separators and a reference on the next line are supported", () => {
  assert.deepEqual(parseReceiptText("Transfer Amount\nPHP 5,850.00\nReference Number\nAB123456789012"), { amountMinor: 585000, reference: "AB123456789012" });
});
test("missing, conflicting, and ambiguous receipt fields are rejected", () => {
  for (const text of ["Account No. 123456789\nPHP 240.00", "Amount 240.00\nRef No. 123", "Transfer Amount PHP 240.00\nTransfer Amount PHP 300.00\nRef No. 123456789012", "Amount 240.00\nRef No. 123456789012\nRef No. 987654321012"]) assert.throws(() => parseReceiptText(text));
});

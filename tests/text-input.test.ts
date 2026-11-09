import { test } from "node:test";
import assert from "node:assert/strict";
import { containsEmoji, emojiFormError, emojiInputMessage } from "../src/lib/text-input";

test("emoji detection rejects faces, flags, skin tones, joined families, and keycaps", () => {
  for (const text of ["\u{1F600}", "\u{1F1F5}\u{1F1ED}", "\u{1F44D}\u{1F3FD}", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", "1\uFE0F\u20E3", "\u2764\uFE0F"]) assert.equal(containsEmoji(text), true);
});
test("normal numbers, international names, punctuation, and email remain accepted", () => {
  for (const text of ["", "Jose\u0301 dela Cruz", "Ma\u00f1ana", "\u674e\u660e", "+639123456789", "name@example.com", "Room #4 * 2 - PHP 1,000.00!"]) assert.equal(containsEmoji(text), false);
});
test("server rejects emoji in any string field without inspecting uploaded file contents", () => {
  const form = new FormData();
  form.set("name", "Customer");
  form.set("photo", new Blob(["image bytes"]), "photo.png");
  assert.equal(emojiFormError(form), null);
  form.append("notes", "Hello \u{1F600}");
  assert.equal(emojiFormError(form), emojiInputMessage);
});

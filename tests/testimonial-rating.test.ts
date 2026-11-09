import { test } from "node:test";
import assert from "node:assert/strict";
import { testimonialRatingSchema, testimonialRatingLabels } from "../src/lib/testimonial-rating";
test("testimonial ratings require whole stars from 1 to 5", () => {
  for (const value of [null, undefined, "", "0", "6", "2.5", "excellent"]) assert.equal(testimonialRatingSchema.safeParse(value).success, false);
  for (let rating = 1; rating <= 5; rating++) assert.equal(testimonialRatingSchema.parse(String(rating)), rating);
  assert.equal(testimonialRatingLabels[4], "Excellent");
});

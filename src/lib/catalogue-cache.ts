import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";

export const catalogueTags = { fleet: "catalogue:fleet:v1", testimonials: "catalogue:testimonials:v1" } as const;
// Compatibility data cache for the current dynamic, nonce-protected app.
// Enabling Cache Components/use cache requires a separate route architecture migration.
// No sessions, request headers, customer records, or availability are stored here.
export const getCachedFleet = unstable_cache(async () => db.vehicle.findMany({
  where: { archived: false, status: "ACTIVE" },
  select: {
    id: true, unitCode: true,
    model: { select: { name: true, slug: true, year: true, category: true, seats: true, transmission: true, features: true } },
    pricing: { select: { dailyMinor: true, currency: true } },
    media: { where: { type: "IMAGE" }, select: { type: true, url: true } },
  },
  orderBy: { unitCode: "asc" },
}), ["fleet-catalogue-v1"], { revalidate: 60, tags: [catalogueTags.fleet] });

export const getCachedTestimonials = unstable_cache(async () => db.testimonial.findMany({
  where: { published: true, sample: false },
  select: { id: true, author: true, content: true, rating: true, customer: { select: { avatarPath: true } } },
  orderBy: { id: "asc" },
}), ["published-testimonials-v2"], { revalidate: 300, tags: [catalogueTags.testimonials] });

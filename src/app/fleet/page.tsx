import { VehicleShowcase } from "@/components/vehicle-showcase";
import { requireUser } from "@/lib/auth";
import { getCachedFleet } from "@/lib/catalogue-cache";
import { money } from "@/lib/validation";
export default async function Fleet() {
  await requireUser("/fleet");
  const vehicles = await getCachedFleet();
  return (
    <section className="wrap page">
      <h1 style={{ fontSize: "clamp(32px, 5vw, 60px)" }}>Find your kind of journey</h1>
<VehicleShowcase vehicles={vehicles.map(v => ({
 id: v.id, name: [v.model.name, v.model.year].filter(Boolean).join(" "),
 image: v.model.slug.includes("veloz") ? "/images/veloz.webp?v=622f91c07d" : v.media.find(m => m.type === "IMAGE")?.url ?? "/images/innova.webp",
 category: v.model.category, seats: v.model.seats, transmission: v.model.transmission, features: v.model.features,
 price: v.pricing ? money(v.pricing.dailyMinor, v.pricing.currency) : null,
}))}/>
      {vehicles.length === 0 && (
        <div className="notice">
          No vehicles are currently available. Please check back soon.
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

const vehicles = [
  { image: "/images/veloz.webp?v=622f91c07d", label: "Toyota Veloz reference image" },
  { image: "/images/innova.webp", label: "Toyota Innova reference image" },
];

export function HeroVehicle() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % vehicles.length);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hero-car" role="img" aria-label={vehicles[active].label}>
      {vehicles.map((vehicle, index) => (
        <div
          key={vehicle.image}
          className={`hero-car-slide${index === active ? " active" : ""}`}
          style={{ backgroundImage: `url("${vehicle.image}")` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

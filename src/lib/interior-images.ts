export type InteriorReference = {
  source: string;
  images: { src: string; label: string; alt: string }[];
};

export const interiorReferences: Record<string, InteriorReference> = {
  "toyota-veloz": {
    source: "https://toyotabalintawak.com/car/veloz/",
    images: [
      { src: "/images/interiors/veloz-dashboard.jpg", label: "Dashboard", alt: "Toyota Veloz dashboard and front cabin, dealer reference photo" },
      { src: "/images/interiors/veloz-cabin.jpg", label: "Passenger seats", alt: "Toyota Veloz rear passenger seats, dealer reference photo" },
      { src: "/images/interiors/veloz-cargo.jpg", label: "Cargo space", alt: "Toyota Veloz interior with rear seats folded, dealer reference photo" },
    ],
  },
  "toyota-innova": {
    source: "https://toyotabalintawak.com/car/innova/",
    images: [
      { src: "/images/interiors/innova-cabin.jpg", label: "Cabin", alt: "Toyota Innova cabin and seating layout, dealer reference image" },
      { src: "/images/interiors/innova-seating.jpg", label: "Passenger seats", alt: "Toyota Innova rear seating and folding seat, dealer reference photo" },
      { src: "/images/interiors/innova-cargo.jpg", label: "Cargo space", alt: "Toyota Innova rear luggage area, dealer reference photo" },
    ],
  },
};

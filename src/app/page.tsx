import { TestimonialCarousel } from "@/components/testimonial-carousel";
import { getCachedTestimonials } from "@/lib/catalogue-cache";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Armchair,
  CalendarCheck,
  HeartHandshake,
  Route,
} from "lucide-react";
import { previews } from "@/lib/public";
import { Reveal } from "@/components/reveal";
import { HeroVehicle } from "@/components/hero-vehicle";
export default async function Home() {
  const reviews = process.env.DATABASE_URL ? await getCachedTestimonials() : [];
  return (
    <>
      <section className="hero">
        <div className="hero-photo" />
        <HeroVehicle />
        <div className="wrap hero-content">
          <p className="eyebrow ">YOUR JOURNEY, OUR COMMITMENT.</p>
          <h1>
            Drive with Trust
            <br />
            Arrive in Comfort
          </h1>
          <p className="hero-description">
            Experience comfort, reliability, and convenience with TrustRide.
            Discover the right vehicle for every journey.
          </p>
          <div className="button-row">
            <Link className="button white" href="/fleet">
              Find Your Ride
            </Link>
          </div>
        </div>
        <div className="hero-bottom wrap">
        </div>
      </section>
      <section className="section wrap" id="fleet">
        <Reveal>
          <div className="section-heading">
            <div>
              <h2>
                Your plans
                <br />
                The perfect companion
              </h2>
            </div>
            <p>
              From everyday escapes to journeys together,
              <br />
              discover a ride that feels right.
            </p>
          </div>
          <div className="fleet-grid">
            {previews.map((v, i) => (
              <Link
                className="vehicle-preview"
                href={`/fleet/${v.id}`}
                key={v.id}
              >
                <div
                  className="vehicle-image"
                  style={{ backgroundImage: `url(${v.image})` }}
                >
                  <span>0{i + 1} / THE COLLECTION</span>
                  <span className="round-arrow">
                    <ArrowUpRight />
                  </span>
                </div>
                <div className="vehicle-copy">
                  <p className="eyebrow refined">{v.tag}</p>
                  <h3>{v.name}</h3>
                  <p>{v.description}</p>
                  <span className="text-link">
                    Discover this ride <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>
      <section className="story-section" id="story">
        <div className="wrap story-grid">
          <div
            className="story-photo"
            role="img"
            aria-label="A scenic road through the mountains"
          />
          <Reveal>
            <p className="eyebrow">MORE THAN A CAR RENTAL</p>
            <h2>
              Good journeys
              <br />
              start with trust.
            </h2>
            <p>
              There’s more to a journey than getting from one place to another.
              It’s the people beside you, the plans ahead, and the comfort of
              knowing you’re in good hands.
            </p>
            <p>
              At TrustRide, we’re building a rental experience around what
              matters: dependable transportation, thoughtful service, and room
              to enjoy the ride.
            </p>
            <Link className="button" href="/about">
              Get to Know Us <ArrowUpRight size={17} />
            </Link>
          </Reveal>
        </div>
      </section>
      <section className="section wrap">
        <Reveal>
          <div className="section-heading">
            <div>
              <h2>
                A little more care
                <br />
                Every mile
              </h2>
            </div>
            <p>
              Considered details. A simpler experience.
              <br />
              That’s the way we like to travel.
            </p>
          </div>
          <div className="benefits">
            {[
              [
                Armchair,
                "Comfort comes along",
                "Thoughtfully selected vehicles with space to settle in and enjoy the journey.",
              ],
              [
                Route,
                "A ride you can rely on",
                "A dependable rental experience, with clear information along the way.",
              ],
              [
                CalendarCheck,
                "Keep it simple",
                "Choose your dates, request your ride, and let us help with the next steps.",
              ],
              [
                HeartHandshake,
                "People first. Always.",
                "Attentive, personal service that puts your plans at the heart of the experience.",
              ],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Armchair;
              return (
                <div key={String(title)}>
                  <I size={30} strokeWidth={1.3} />
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>
      <TestimonialCarousel reviews={reviews.map(({ id, author, content, rating }) => ({ id, author, content, rating }))} />
      <section className="cta wrap">
        <div>
          <p className="eyebrow">WHERE WILL YOU GO NEXT?</p>
          <h2>
            Your next chapter
            <br />
            Your next ride
          </h2>
        </div>
        <Link className="button" href="/fleet">
          Find Your Ride <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { TestimonialRating } from "./testimonial-rating";
import styles from "./testimonial-carousel.module.css";

type Review = { id: string; author: string; content: string; rating: number | null };
export function TestimonialCarousel({ reviews }: { reviews: Review[] }) {
  const [active, setActive] = useState(0);
  return <section className={styles.section} aria-label="Customer testimonials" aria-roledescription="carousel">
    <div className={styles.heading}><p>THE JOURNEY, IN WORDS</p><h2>Made for memorable miles.</h2><span>Real experiences. Shared by our travellers.</span></div>
    {reviews.length ? <><div className={styles.stage}>{reviews.map((review, index) => {
      let offset = (index - active + reviews.length) % reviews.length;
      if (offset > reviews.length / 2) offset -= reviews.length;
      return <article key={review.id} className={styles.card} data-position={Math.abs(offset) > 2 ? "hidden" : offset} aria-hidden={offset !== 0} aria-label={`Review ${index + 1} of ${reviews.length}`}>
        <Quote size={30} aria-hidden="true"/><TestimonialRating rating={review.rating}/><blockquote>{review.content}</blockquote><strong>{review.author}</strong><span>Customer story</span>
      </article>;
    })}</div><div className={styles.controls}><button type="button" aria-label="Previous testimonial" disabled={reviews.length < 2} onClick={() => setActive((active - 1 + reviews.length) % reviews.length)}><ArrowLeft size={19}/></button><span aria-live="polite">{active + 1} / {reviews.length}</span><button type="button" aria-label="Next testimonial" disabled={reviews.length < 2} onClick={() => setActive((active + 1) % reviews.length)}><ArrowRight size={19}/></button></div></> : <div className={styles.empty}><Quote size={36}/><h3>Your journey could inspire the next.</h3><p>Approved reviews from completed rentals will appear here.</p></div>}
    <Link className={styles.explore} href="/testimonials">Explore customer stories <ArrowRight size={16}/></Link>
  </section>;
}

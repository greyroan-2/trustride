ALTER TABLE "Testimonial" ADD COLUMN "rating" SMALLINT;
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

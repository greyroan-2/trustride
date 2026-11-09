import { z } from "zod";
export const testimonialRatingLabels = ["Poor", "Fair", "Good", "Very good", "Excellent"] as const;
export const testimonialRatingSchema = z.coerce.number().int("Choose a whole star rating.").min(1, "Choose a star rating from 1 to 5.").max(5, "Choose a star rating from 1 to 5.");

import { z } from "zod";
export const passwordResetSchema = z.object({
  password: z.string().min(10, "Use at least 10 characters.").max(128, "Use no more than 128 characters."),
  confirmPassword: z.string(),
}).refine(value => value.password === value.confirmPassword, { message: "The passwords do not match.", path: ["confirmPassword"] });
export const passwordResetSuccess = "Password updated. Sign in with your new password.";

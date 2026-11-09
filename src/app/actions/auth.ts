"use server";
import { activeSessionUser } from "@/lib/auth-session";
import { passwordResetSchema, passwordResetSuccess } from "@/lib/password-reset";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { emojiFormError } from "@/lib/text-input";
import { redirect } from "next/navigation";
import { supabase, configured } from "@/lib/supabase";
import { credentials } from "@/lib/validation";
import { safeNext, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
export async function authenticate(form: FormData) {
  if (await activeSessionUser()) redirect("/");
  const parsedMode = z
    .enum(["login", "register", "forgot-password"])
    .safeParse(form.get("mode"));
  const mode = parsedMode.success ? parsedMode.data : "login";
  const next = safeNext(form.get("next"));
  const emojiError = emojiFormError(form);
  if (emojiError) redirect(`/${mode}?next=${encodeURIComponent(next)}&message=${encodeURIComponent(emojiError)}`);
  let message = "";
  if (!configured())
    message = "Authentication requires Supabase configuration. See README.md.";
  else {
    const client = await supabase();
    const email = String(form.get("email"));
    if (mode === "forgot-password") {
      if (!z.email().safeParse(email).success)
        message = "Enter a valid email address.";
      else {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
        });
        message = error
          ? "Unable to send reset instructions. Please try again."
          : "If an account exists, password reset instructions have been sent.";
      }
    } else {
      const schema = mode === "login"
        ? credentials.extend({ password: z.string().min(1).max(128) })
        : credentials;
      const parsed = schema.safeParse({
        email,
        password: form.get("password"),
      });
      if (!parsed.success)
        message =
          mode === "register"
            ? "Enter a valid email and a password of at least 10 characters."
            : "Enter a valid email and your password.";
      else if (mode === "register") {
        const name = String(form.get("name") ?? "").slice(0, 100);
        const { error } = await client.auth.signUp({
          ...parsed.data,
          options: {
            data: { name },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        message = error
          ? "Registration could not be completed. Please try again."
          : "Check your email to confirm your account before signing in.";
      } else {
        const { error } = await client.auth.signInWithPassword(parsed.data);
        if (error)
          message =
            "Unable to sign in. Check your credentials and email confirmation.";
      }
    }
  }
  if (message)
    redirect(
      `/${mode}?next=${encodeURIComponent(next)}&message=${encodeURIComponent(message)}`,
    );
  const user = await requireUser(next);
  revalidatePath("/", "layout");
  redirect(user.role === "ADMIN" && next === "/fleet" ? "/admin" : next);
}
export async function logout() {
  if (configured()) {
    const client = await supabase();
    const { data: { user } } = await client.auth.getUser();
    const { error } = await client.auth.signOut({ scope: "global" });
    if (error) throw new Error("Unable to sign out of all browsers. Please try again.");
    if (user) {
      try {
        await db.$executeRaw`SELECT realtime.send('{}'::jsonb, 'signed_out', ${`trustride:auth:${user.id}`}, true)`;
      } catch {
        // Revocation already succeeded; disconnected clients also verify on focus/poll.
        console.error("Realtime logout notification failed.");
      }
    }
  }
  revalidatePath("/", "layout");
  redirect("/");
}
export async function updateProfile(form: FormData) {
  const user = await requireUser("/profile");
  const emojiError = emojiFormError(form);
  if (emojiError) redirect(`/profile?message=${encodeURIComponent(emojiError)}`);
  const name = z.string().min(1).max(100).parse(form.get("name"));
  const parsedPhone = z.string().regex(/^(?:\+63[0-9]{1,11})?$/).safeParse(form.get("phone"));
  if (!parsedPhone.success) redirect("/profile?message=Phone+must+contain+only+up+to+11+digits+after+%2B63.");
  const phone = parsedPhone.data;
  await db.userProfile.update({
    where: { id: user.id },
    data: { name, phone },
  });
  const password = String(form.get("password") ?? "");
  if (password) {
    z.string().min(10).max(128).parse(password);
    const { error } = await (await supabase()).auth.updateUser({ password });
    if (error) redirect("/profile?message=Password+update+failed");
  }
  revalidatePath("/profile");
  revalidatePath("/bookings", "layout");
  revalidatePath("/dashboard");
  redirect(`/profile?message=Profile+saved&noticeId=${crypto.randomUUID()}`);
}


export async function resetPassword(_previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const user = await requireUser("/reset-password");
  const parsed = passwordResetSchema.safeParse({ password: form.get("password"), confirmPassword: form.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your new password." };
  try {
    await enforceRateLimit("password-change", user.id, 5, 900);
    const client = await supabase();
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: "Could not update your password. Use a different strong password, or request a fresh reset link." };
    const { error: signOutError } = await client.auth.signOut({ scope: "global" });
    if (signOutError) return { error: "Your password was updated, but sign-out could not be completed. Sign out from your account before signing in again." };
  } catch (error) {
    return { error: error instanceof RateLimitError ? error.message : "Password reset is temporarily unavailable. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect(`/login?message=${encodeURIComponent(passwordResetSuccess)}`);
}

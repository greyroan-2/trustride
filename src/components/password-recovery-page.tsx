"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { authenticate, resetPassword } from "@/app/actions/auth";
import { SubmitButton } from "./submit-button";
import styles from "./password-recovery.module.css";

export function PasswordRecoveryPage({ mode, next = "/fleet", message, configured = true, validSession = false }: { mode: "request" | "reset"; next?: string; message?: string; configured?: boolean; validSession?: boolean }) {
  const [state, action, pending] = useActionState(resetPassword, {});
  const [visible, setVisible] = useState(false);
  const resetting = mode === "reset";
  const emailSent = !resetting && message === "If an account exists, password reset instructions have been sent.";
  const expired = resetting && !validSession;
  return <section className={styles.page}><div className={styles.container}>
    <Link href={`/login?next=${encodeURIComponent(next)}`} className={styles.back}><ArrowLeft size={16} />Back to sign in</Link>
    <div className={styles.card}>
      <Link className={styles.brand} href="/">Trust<span>Ride</span></Link>
      <div className={styles.icon}>{emailSent ? <Mail size={26} /> : <KeyRound size={26} />}</div>
      <h1>{expired ? "Request a fresh link" : resetting ? "Set a new password" : emailSent ? "Check your inbox" : "Forgot your password?"}</h1>
      <p className={styles.intro}>{expired ? "Your reset session is missing or has expired. Request a new email to securely reset your password." : resetting ? "Choose a strong password to keep your account and your next journey secure." : emailSent ? "If an account matches that email, a reset link is on its way. Check your spam folder too." : "Enter the email linked to your account. We will send you a link to get back on the road."}</p>
      {expired ? <Link className={`button ${styles.primaryLink}`} href="/forgot-password">Request reset link<ArrowRight size={16} /></Link> : resetting ? <form action={action} className={styles.form}>
        <label htmlFor="reset-new-password">New password</label>
        <div className={styles.passwordField}><input id="reset-new-password" name="password" type={visible ? "text" : "password"} required minLength={10} maxLength={128} autoComplete="new-password" placeholder="At least 10 characters" disabled={pending} /><button type="button" className={styles.toggle} aria-label={visible ? "Hide passwords" : "Show passwords"} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        <label htmlFor="reset-confirm-password">Confirm new password</label><input id="reset-confirm-password" name="confirmPassword" type={visible ? "text" : "password"} required minLength={10} maxLength={128} autoComplete="new-password" placeholder="Enter your new password again" disabled={pending} />
        {state.error && <p className={styles.error} role="alert">{state.error}</p>}
        <div className={styles.submitRow}><SubmitButton>Update password<ArrowRight size={16} /></SubmitButton></div>
      </form> : <>
        {emailSent && <div className={styles.sent} role="status"><CheckCircle2 size={18} />Reset instructions requested</div>}
        {(!configured || (message && !emailSent)) && <p className={styles.error} role="alert">{message || "Password recovery is currently unavailable. Please try again later."}</p>}
        <form action={authenticate} className={styles.form}><input type="hidden" name="mode" value="forgot-password" /><input type="hidden" name="next" value={next} />
          <label htmlFor="recovery-email">Email address</label><div className={styles.emailField}><Mail size={18} aria-hidden="true" /><input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required disabled={!configured} /></div>
          <div className={styles.submitRow}><SubmitButton disabled={!configured}>{emailSent ? "Send another link" : "Send reset link"}<ArrowRight size={16} /></SubmitButton></div>
        </form>
      </>}
      <div className={styles.safety}><ShieldCheck size={16} /><span>{resetting ? "Your password is updated securely through your verified account." : "For your privacy, we never reveal whether an email is registered."}</span></div>
    </div>
    <p className={styles.footer}>Remember your password? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
  </div></section>;
}

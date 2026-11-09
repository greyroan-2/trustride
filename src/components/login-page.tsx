"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { passwordResetSuccess } from "@/lib/password-reset";
import { authenticate } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { SuccessToast } from "@/components/success-toast";

const photos = ["/images/place1.webp", "/images/place2.webp", "/images/place3.webp"];

export function LoginPage({ next, message, configured, mode = "login" }: { next: string; message?: string; configured: boolean; mode?: "login" | "register" }) {
  const registering = mode === "register";
  const success = (registering && message === "Check your email to confirm your account before signing in.") || message === passwordResetSuccess;
  const hasError = Boolean(message && !success);
  const [photo, setPhoto] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setPhoto(p => (p + 1) % photos.length), 10000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="login-screen" data-auth-mode={mode}>
      <div className="login-card">
        <div className="login-photo-panel">
          {photos.map((src, i) => <Image key={src} src={src} alt="" fill priority={i === 0} sizes="(max-width: 760px) 100vw, 50vw" className={`login-photo${photo === i ? " active" : ""}`} />)}
          <div className="login-photo-shade" />
          <Link href="/" className="login-back"><ArrowLeft size={16} /> Back to TrustRide</Link>
          <div className="login-photo-bottom">
            <p className="login-photo-eyebrow">THE JOURNEY STARTS HERE</p>
            <h2>A little further.<br />A little more freedom.</h2>
            <p>Find your next destination.<br />We’ll take care of the ride.</p>
            <div className="login-photo-controls">
              <div className="login-photo-dots" aria-label={`Photo ${photo + 1} of 3`}>{photos.map((_, i) => <span key={i} className={photo === i ? "active" : ""} />)}</div>
              <div><button type="button" aria-label="Previous photo" onClick={() => setPhoto(p => (p + 2) % 3)}><ArrowLeft size={18} /></button><button type="button" aria-label="Next photo" onClick={() => setPhoto(p => (p + 1) % 3)}><ArrowRight size={18} /></button></div>
            </div>
          </div>
        </div>
        <div className="login-form-panel">
          <div className="login-form-top"><Link href="/" className="login-wordmark">Trust<span>Ride</span></Link><span>CAR RENTAL SERVICES</span></div>
          <div className="login-form-content">
            <p className="eyebrow">YOUR NEXT JOURNEY AWAITS</p>
            <h1>{registering ? "Your journey starts here" : "Welcome back"}</h1>
            <p className="login-intro">A better journey begins with trust.</p>
            {success && message && <SuccessToast message={message} />}
            {(!configured || hasError) && <div className="login-error-reveal" key={message || "unavailable"}><div><div className="login-error" id="login-error" role="alert"><AlertCircle size={18} /><span>{message || "Sign-in is currently unavailable. Please try again later."}</span></div></div></div>}
            <form action={authenticate} className="login-form">
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="next" value={next} />
              {registering && <><label htmlFor="register-name">Full name</label><input id="register-name" name="name" placeholder="Your full name" required maxLength={100} autoComplete="name" /></>}
              <label htmlFor="login-email" data-hide-required={registering ? undefined : true}>Email address</label>
              <input id="login-email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" aria-invalid={hasError ? true : undefined} aria-describedby={hasError ? "login-error" : undefined} />
              <label htmlFor="login-password" data-hide-required={registering ? undefined : true}>Password</label>
              <div className="login-password-field"><input id="login-password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required minLength={registering ? 10 : 1} maxLength={128} autoComplete={registering ? "new-password" : "current-password"} aria-invalid={hasError ? true : undefined} aria-describedby={hasError ? "login-error" : undefined} /><button type="button" className="login-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(s => !s)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              {registering ? <p className="login-password-hint">Use at least 10 characters for your password.</p> : <Link className="login-forgot" href={`/forgot-password?next=${encodeURIComponent(next)}`}>Forgot password?</Link>}
              <SubmitButton disabled={!configured}>{registering ? "Create account" : "Sign in"} <ArrowRight size={17} /></SubmitButton>
            </form>
            <p className="login-signup">{registering ? "Already have an account?" : "New to TrustRide?"} <Link href={`/${registering ? "login" : "register"}?next=${encodeURIComponent(next)}`}>{registering ? "Sign in" : "Create an account"}</Link></p>
          </div>
          <p className="login-legal">By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
        </div>
      </div>
    </section>
  );
}

"use client";
import { useState } from "react";
import { UserRound, ShieldCheck, Mail, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import Link from "next/link";
import { updateProfile } from "@/app/actions/auth";
import { SubmitButton } from "./submit-button";
import { ProfilePhotoSettings } from "./profile-photo-settings";
import { LogoutButton } from "./logout-button";

type Account = { name: string; email: string; phone: string; avatarUrl?: string | null };
export function AccountSettings({ user }: { user: Account }) {
  const [visible, setVisible] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState(() => user.phone.replace(/^\+63/, "").replace(/\D/g, "").slice(0, 11));
  return <>
    <Link href="/dashboard" className="account-back"><ArrowLeft size={15} />Back to dashboard</Link>
    <div className="account-page-heading"><h1>Account settings</h1><span>Manage your personal details and keep your account secure.</span></div>
    <div className="account-settings-layout">
      <aside className="account-identity-card"><ProfilePhotoSettings name={user.name || "Your account"} avatarUrl={user.avatarUrl} /><h2>{user.name || "Your account"}</h2><p className="account-email"><Mail size={14} />{user.email}</p><span className="account-member-label">TrustRide member</span><nav aria-label="Account sections"><a href="#personal-details"><UserRound size={17} />Personal details</a><a href="#account-security"><ShieldCheck size={17} />Password & security</a></nav><div className="account-signout-section"><p>Finished for now?</p><LogoutButton className="account-signout" showIcon /></div></aside>
      <form action={updateProfile} className="account-settings-form">
        <section className="account-form-card" id="personal-details" aria-labelledby="personal-details-title"><div className="account-section-heading"><span><UserRound size={20} /></span><div><h2 id="personal-details-title">Personal details</h2><p>How we can reach you about your reservations.</p></div></div><div className="account-fields"><label htmlFor="account-name">Full name<input id="account-name" name="name" defaultValue={user.name} required maxLength={100} autoComplete="name" placeholder="Your full name" /></label><label htmlFor="account-phone">Phone number <span className="account-optional">Optional</span><span className="account-phone-input"><span aria-hidden="true">+63</span><input id="account-phone" type="tel" inputMode="numeric" pattern="[0-9]{1,11}" value={phoneDigits} onChange={event => setPhoneDigits(event.target.value.replace(/\D/g, "").slice(0, 11))} onKeyDown={event => { if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) event.preventDefault(); }} maxLength={11} autoComplete="tel-national" aria-label="Phone number, country code plus 63" placeholder="9123456789" /><input type="hidden" name="phone" value={phoneDigits ? `+63${phoneDigits}` : ""} /></span></label><div className="account-email-note"><Mail size={16} /><div><span>Sign-in email</span><strong>{user.email}</strong></div></div></div></section>
        <section className="account-form-card" id="account-security" aria-labelledby="account-security-title"><div className="account-section-heading"><span><ShieldCheck size={20} /></span><div><h2 id="account-security-title">Password & security</h2><p>Choose a strong password to protect your account.</p></div></div><div className="account-fields"><label htmlFor="account-password">New password <span className="account-optional">Optional</span><span className="account-password-input"><input id="account-password" name="password" type={visible ? "text" : "password"} minLength={10} maxLength={128} autoComplete="new-password" placeholder="Enter a new password" aria-describedby="account-password-help" /><button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label><p className="account-field-hint" id="account-password-help">Use at least 10 characters. Leave this blank to keep your current password.</p></div></section>
        <div className="account-save-bar"><span><ShieldCheck size={15} />Your changes apply to your TrustRide account.</span><SubmitButton><Check size={16} />Save changes</SubmitButton></div>
      </form>
    </div>
  </>;
}

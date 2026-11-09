import { LegalPage } from "@/components/legal-page";
import { ContactPage } from "@/components/contact-page";
import { isGuestOnlyAuthPage } from "@/lib/auth-redirect";
import { TestimonialsPage } from "@/components/testimonials-page";
import { profilePhotoUrl } from "@/lib/profile-photo";
import { PasswordRecoveryPage } from "@/components/password-recovery-page";
import { activeSessionUser } from "@/lib/auth-session";
import { AccountSettings } from "@/components/account-settings";
import Image from "next/image";
import dtiRegistration from "../../../public/images/dti-accredited.jpg";
import { notFound, redirect } from "next/navigation";
import { requireUser, safeNext } from "@/lib/auth";
import { configured } from "@/lib/supabase";
import { LoginPage } from "@/components/login-page";
import { SuccessToast } from "@/components/success-toast";
import { SelfDriveRequirements } from "@/components/self-drive-requirements";
const content: Record<string, { title: string; body: string[] }> = {
  about: {
    title: "Good journeys start with trust.",
    body: [
      "TrustRide is built around a simple idea: renting a vehicle should feel straightforward, comfortable, and personal.",
      "We are developing a thoughtfully selected Toyota fleet and a reservation experience that gives you space to focus on your plans. Our commitment is to clear information, dependable transportation, and customer-focused service.",
    ],
  },
  testimonials: {
    title: "Every journey has a story.",
    body: [
      "Customer stories will appear here after customers share their experience and TrustRide approves publication.",
      "Sample testimonial · illustrative content, not a customer review: “An easy reservation, a comfortable ride, and more time to enjoy the journey.”",
    ],
  },

};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  if (isGuestOnlyAuthPage(slug) && await activeSessionUser()) redirect("/");
  if (slug === "privacy" || slug === "terms") return <LegalPage kind={slug} />;
  if (slug === "testimonials") return <TestimonialsPage />;
  if (slug === "contact") return <ContactPage />;
  if (slug === "services") return <SelfDriveRequirements />;
  const q = await searchParams;
  if (slug === "login" || slug === "register") return <LoginPage mode={slug} next={safeNext(q.next)} message={q.message} configured={configured()} />;
  if (slug === "forgot-password") return <PasswordRecoveryPage mode="request" next={safeNext(q.next)} message={q.message} configured={configured()} />;
  if (slug === "reset-password") return <PasswordRecoveryPage mode="reset" validSession={Boolean(await activeSessionUser())} />;
  if (slug === "profile") {
    const user = await requireUser("/profile");
    return (
      <section className="wrap page account-settings-page">
        {q.message && (q.message === "Profile saved" ? <SuccessToast key={q.noticeId ?? q.message} message={q.message} /> : <p className="notice" role="alert">{q.message}</p>)}
        <AccountSettings user={{ name: user.name, email: user.email, phone: user.phone, avatarUrl: profilePhotoUrl(user.avatarPath) }} />
      </section>
    );
  }
  const data = content[slug];
  if (!data) notFound();
  return (
    <section className="wrap page">
      <div className="page-title">
        <p className="eyebrow">TRUST RIDE / {slug.toUpperCase()}</p>
        <h1>{data.title.replace(/\.$/, "")}</h1>
        {data.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {slug === "about" && (
        <section className="about-registration" aria-labelledby="registration-heading">
          <div>
            <p className="eyebrow">BUSINESS REGISTRATION</p>
            <h2 id="registration-heading">Registered with DTI</h2>
            <p>TrustRide is registered with the Department of Trade and Industry (DTI) in compliance with business name registration requirements.</p>
          </div>
          <Image
            src={dtiRegistration}
            alt="TrustRide DTI business registration document"
            sizes="(max-width: 760px) 89vw, 45vw"
          />
        </section>
      )}

    </section>
  );
}

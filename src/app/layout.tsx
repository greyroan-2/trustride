import { connection } from "next/server";
﻿import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from "@/components/notification-provider";
import { AuthHeader } from "@/components/auth-header";
import { Footer } from "@/components/footer";
import { PageTransition } from "@/components/page-transition";
import { SessionSync } from "@/components/session-sync";
import { SaveFeedback } from "@/components/save-feedback";
import { TextInputRestrictions } from "@/components/text-input-restrictions";
import { ValidationFeedback } from "@/components/validation-feedback";

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: {
    default: "TrustRide",
    template: "%s | TrustRide",
  },
  description:
    "Discover thoughtful car rental with TrustRide. Explore Toyota Veloz and Innova for your next journey.",
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  // Per-request CSP nonces require dynamically rendered framework scripts.
  await connection();
  return (
    <html lang="en" className={openSans.variable}>
      <body>
        <SessionSync />
        <SaveFeedback />
        <ValidationFeedback />
        <TextInputRestrictions />
        <a className="skip" href="#main">
          Skip to content
        </a>
        <NotificationProvider><AuthHeader />
        <main id="main">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer /></NotificationProvider>
      </body>
    </html>
  );
}


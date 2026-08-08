import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans } from "next/font/google";
import { bakeryIdentity } from "@/lib/bakery";
import "./globals.css";

// Self-hosted at build time by next/font (no runtime Google call).
// font-display: swap avoids the flash-of-invisible-text on the paper background.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { name, tagline, location } = bakeryIdentity();
  return {
    title: `${name} — custom cakes, made one at a time`,
    description: `${tagline} Home bakery in ${location}. Pickup only, one week's notice.`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

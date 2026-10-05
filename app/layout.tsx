import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Proposals", template: "%s · Proposals" },
  description: "Write, send, sign and get paid for proposals.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading request headers renders every page per request, so Next.js can stamp the CSP nonce
  // (set in middleware.ts) on its scripts. Prerendered pages would carry no nonce and be blocked.
  await headers();
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}

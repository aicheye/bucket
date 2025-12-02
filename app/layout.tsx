import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { Lora, Playfair_Display } from "next/font/google";
import authOptions from "../lib/nextauth";
import "./globals.css";
import Providers from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bucket",
  description: "The all-in-one course management tool",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = (await getServerSession(authOptions as any)) as Session | null;

  return (
    <html lang="en" className="bg-base-200">
      <body
        className={`${playfair.variable} ${lora.variable} bg-base-200 h-full font-serif`}
      >
        {/* Skip link for keyboard users */}
        <a href="#content" className="skip-link">
          Skip to main content
        </a>
        <Providers session={session}>
          <div id="content" tabIndex={-1} className="flex-1">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

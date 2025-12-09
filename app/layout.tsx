import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Suspense } from "react";
import { APP_NAME } from "../lib/constants";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "The all-in-one course management tool",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: APP_NAME,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-base-200">
      <body className="bg-base-200 h-full font-serif">
        {/* Skip link for keyboard users */}
        <a href="#content" className="skip-link">
          Skip to main content
        </a>
        <Suspense
          fallback={<div id="content" tabIndex={-1} className="flex-1" />}
        >
          <Providers>
            <div id="content" tabIndex={-1} className="flex-1">
              {children}
            </div>
            <Analytics />
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}

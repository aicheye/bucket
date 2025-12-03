import type { Metadata } from "next";
// Note: avoid calling `getServerSession` at the root layout to allow
// pages to be statically generated. Session will be fetched client-side
// by `SessionProvider` in `Providers` when needed.
import { Suspense } from "react";
import { APP_NAME } from "../lib/constants";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "The all-in-one course management tool",
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
        <Suspense fallback={<div id="content" tabIndex={-1} className="flex-1" />}>
          <Providers>
            <div id="content" tabIndex={-1} className="flex-1">
              {children}
            </div>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}

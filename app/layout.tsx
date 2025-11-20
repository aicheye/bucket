import type { Metadata } from "next";
// @ts-ignore: allow side-effect import of global CSS without type declarations
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Bucket",
  description: "The all-in-one course management tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-base-300 min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

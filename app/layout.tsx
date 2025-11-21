import type { Metadata } from "next";
import { Lora, Playfair_Display } from "next/font/google";
// @ts-expect-error: allow side-effect import of global CSS without type declarations
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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${playfair.variable} ${lora.variable} bg-base-300 min-h-screen font-serif`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

import type { Metadata } from "next";
import { Lora, Playfair_Display } from "next/font/google";
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
        <html lang="en" className="bg-base-300">
            <body className={`${playfair.variable} ${lora.variable} bg-base-300 h-full font-serif`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { StickyBar } from "@/components/StickyBar";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loving Cup — NOPA order ahead",
  description:
    "Order-ahead frozen yogurt pickup at Loving Cup NOPA. Live Square catalog when configured; demo mode otherwise.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${outfit.variable} antialiased`}>
        <CartProvider>
          <StickyBar />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

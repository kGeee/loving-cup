import type { Metadata } from "next";
import { CartProvider } from "@/components/CartProvider";
import { StickyBar } from "@/components/StickyBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loving Cup — NOPA order ahead",
  description:
    "Order-ahead frozen yogurt pickup at Loving Cup NOPA. Live Square catalog when configured; shop-true demo otherwise.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <CartProvider>
          <StickyBar />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

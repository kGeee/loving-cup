"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { NOPA } from "@/lib/env";

export function StickyBar() {
  const { count } = useCart();

  return (
    <header className="sticky-bar">
      <div className="sticky-bar__inner">
        <Link href="/" className="sticky-bar__brand" aria-label="Loving Cup home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="sticky-bar__logo"
            src="/logo.webp"
            alt="Loving Cup"
            width={140}
            height={58}
          />
        </Link>
        <div className="sticky-bar__meta">
          <span className="sticky-bar__nopa" title={NOPA.address}>
            {NOPA.name}
          </span>
          <Link href="/cart" className="sticky-bar__cart">
            Cart{count > 0 ? ` · ${count}` : ""}
          </Link>
        </div>
      </div>
    </header>
  );
}

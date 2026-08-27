"use client";

export function DemoBanner({ mode }: { mode: "demo" | "square" }) {
  if (mode !== "demo") return null;
  return (
    <div className="demo-banner" role="status">
      <strong>Demo / POC mode</strong>
      <span>
        Sample catalog &amp; fake-pay — not live Square. Prices match the brief
        (Kid $4.99 · S $6 · M $7 · L $8 · Pint $12). Set{" "}
        <code>SQUARE_*</code> env to use the real Catalog/Orders/Payments.
      </span>
    </div>
  );
}

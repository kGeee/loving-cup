"use client";

export function DemoBanner({ mode }: { mode: "demo" | "square" }) {
  if (mode !== "demo") return null;
  return (
    <div className="demo-banner" role="status">
      <strong>Demo / POC mode</strong>
      <span>
        Sample catalog &amp; fake-pay — not live Square. Pricing mirrors Catalog:{" "}
        <strong>$4.99 base</strong> + size modifiers (+$1.01 Small · +$2.01 Medium ·
        +$3.01 Large · +$7.01 Pint). Never the /menu JPEG $6/$7/$8/$12 as hardcoded
        variation prices. Set <code>SQUARE_*</code> for live Catalog/Orders/Payments.
      </span>
    </div>
  );
}

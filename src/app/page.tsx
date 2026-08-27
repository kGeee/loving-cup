import { DemoBanner } from "@/components/DemoBanner";
import { MenuGrid } from "@/components/MenuGrid";
import { fetchCatalog } from "@/lib/catalog";
import { getAppMode, NOPA } from "@/lib/env";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const mode = getAppMode();
  let items: Awaited<ReturnType<typeof fetchCatalog>>["items"] = [];
  let loadError: string | null = null;
  try {
    const catalog = await fetchCatalog();
    items = catalog.items;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Catalog unavailable";
  }

  return (
    <main>
      <div className="section" style={{ paddingBottom: 0, paddingTop: "0.5rem" }}>
        <DemoBanner mode={mode} />
      </div>

      <section className="hero" aria-label="Loving Cup">
        <div className="hero__plane" aria-hidden />
        <div className="hero__content">
          <h1 className="hero__brand">Loving Cup</h1>
          <p className="hero__headline">
            Soft-serve ahead for NOPA pickup.
          </p>
          <p className="hero__sub">
            Pickup only — browse the menu with no delivery wall. Customize size,
            base, mix-ins, cone. Kitchen: {NOPA.name} only.
          </p>
          <div className="hero__cta">
            <a className="btn btn--on-dark" href="#menu">
              Order ahead
            </a>
            <Link className="btn btn--outline-light" href="/cart">
              Cart
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="menu">
        <h2>Menu</h2>
        <p className="lede">
          {mode === "demo"
            ? "Sample demo catalog — $4.99 base + size modifiers (Square model). Not live Square data."
            : "Live from Square Catalog (froyo only; shared-catalog pizza SKUs filtered out)."}
        </p>
        {loadError ? <p className="form-error">{loadError}</p> : null}
        <MenuGrid items={items} />

        <div className="hours">
          <strong>{NOPA.name}</strong>
          <span>{NOPA.address}</span>
          <span>{NOPA.phone}</span>
          <span>Hours {NOPA.hours}</span>
        </div>
      </section>
    </main>
  );
}

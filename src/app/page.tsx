import { DemoBanner } from "@/components/DemoBanner";
import { MenuGrid } from "@/components/MenuGrid";
import { fetchCatalog } from "@/lib/catalog";
import { getAppMode, NOPA } from "@/lib/env";

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
      <DemoBanner mode={mode} />

      <section className="hero" aria-label="Loving Cup">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero__plane"
          src="/hero-cones.webp"
          alt=""
          width={2500}
          height={1667}
        />
        <div className="hero__scrim" aria-hidden />
        <div className="hero__content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="hero__logo"
            src="/logo.webp"
            alt="Loving Cup"
            width={320}
            height={133}
          />
          <h1 className="hero__headline">Frozen Yogurt Made Right™</h1>
          <p className="hero__sub">
            {NOPA.name} · {NOPA.address} · {NOPA.hours}
          </p>
          <div className="hero__cta">
            <a className="btn btn--primary" href="#menu">
              Order
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="menu">
        <h2>Menu</h2>
        <p className="lede">Pickup only at NOPA — no delivery wall.</p>
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

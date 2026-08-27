"use client";

import { CupBuildAnimation } from "@/components/CupBuildAnimation";
import type { AppOrder } from "@/types/menu";
import { useCallback, useMemo, useState } from "react";

/** Dev-only loop of the pay cup-build — open `/dev/cup-build`. */
const DEMO_ORDER: AppOrder = {
  id: "dev_cup_build",
  mode: "demo",
  status: "PAID",
  locationId: "nopa",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  customerName: "Dev",
  lineItems: [
    {
      lineId: "1",
      itemId: "item_strawberry_shortcake",
      itemName: "Strawberry Shortcake",
      variationId: "var_cup",
      variationName: "Cup",
      quantity: 1,
      unitPriceCents: 499,
      modifiers: [
        {
          modifierListId: "size",
          modifierId: "med",
          name: "Medium",
          priceCents: 201,
        },
        {
          modifierListId: "mixin",
          modifierId: "straw",
          name: "Strawberries",
          priceCents: 0,
        },
        {
          modifierListId: "mixin",
          modifierId: "animal",
          name: "Animal Crackers",
          priceCents: 0,
        },
        {
          modifierListId: "mixin",
          modifierId: "oreo",
          name: "Oreos",
          priceCents: 75,
        },
        {
          modifierListId: "mixin",
          modifierId: "sprinkles",
          name: "Rainbow Sprinkles",
          priceCents: 75,
        },
      ],
    },
  ],
  subtotalCents: 850,
  discountCents: 0,
  totalCents: 850,
  currency: "USD",
};

export default function DevCupBuildPage() {
  const [key, setKey] = useState(0);
  const [done, setDone] = useState(false);
  const order = useMemo(() => DEMO_ORDER, []);
  const onFinished = useCallback(() => setDone(true), []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, letterSpacing: "0.06em", marginBottom: 12 }}>
          DEV CUP BUILD · force motion
        </p>
        <CupBuildAnimation
          key={key}
          order={order}
          reducedMotion={false}
          forceMotion
          onFinished={onFinished}
        />
        <p style={{ fontSize: 13, marginTop: 12 }}>
          {done ? "Paid · NOPA pickup" : "Building…"}
        </p>
        <button
          type="button"
          className="btn btn--primary"
          style={{ marginTop: 16, pointerEvents: "auto" }}
          onClick={() => {
            setDone(false);
            setKey((k) => k + 1);
          }}
        >
          Replay
        </button>
      </div>
    </main>
  );
}

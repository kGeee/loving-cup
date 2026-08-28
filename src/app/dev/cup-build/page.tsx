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
          modifierListId: "base",
          modifierId: "vanilla",
          name: "Nonfat Vanilla",
          priceCents: 0,
        },
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
    <main className="dev-cup-build">
      <p className="dev-cup-build__label">DEV CUP BUILD · force motion</p>
      <CupBuildAnimation
        key={key}
        order={order}
        reducedMotion={false}
        forceMotion
        presentation="hero"
        onFinished={onFinished}
        footer={
          done ? (
            <p className="cup-build-hero__paid">Paid · NOPA pickup</p>
          ) : undefined
        }
      />
      <div className="dev-cup-build__controls">
        <p className="dev-cup-build__status">
          {done ? "Complete — replay to watch again" : "Building your cup…"}
        </p>
        <button
          type="button"
          className="btn btn--primary cup-build-hero__cta"
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

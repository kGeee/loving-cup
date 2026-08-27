"use client";

import type { AppOrder, CartLine, CartModifierSelection } from "@/types/menu";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";

/** Immersive cup-build wall-clock — slow enough to read the make. */
export const CUP_BUILD_MS = 2800;

const MYO_STILL = "/cup-strawberry-shortcake.webp";

const NAMED_STILL: Record<string, string> = {
  salty_dog: "/cup-salty-dog.webp",
  strawberry_shortcake: "/cup-strawberry-shortcake.webp",
  thinner_mint: "/cup-thinner-mint.webp",
  peanut_butter_cup: "/cup-peanut-butter-cup.webp",
  blueberry_dream: "/cup-blueberry-dream.webp",
  lone_wolf: "/cup-lone-wolf.webp",
};

type YogurtPalette = {
  deep: string;
  mid: string;
  light: string;
  fleck?: string;
};

const NAMED_YOGURT: Record<string, YogurtPalette> = {
  salty_dog: {
    deep: "#c4a07a",
    mid: "#e8d0b0",
    light: "#f6ead8",
    fleck: "#8b5a2b",
  },
  strawberry_shortcake: {
    deep: "#e8a0a8",
    mid: "#f3c4c8",
    light: "#fbe6e8",
    fleck: "#d64545",
  },
  thinner_mint: {
    deep: "#7fbf9a",
    mid: "#c8e8d4",
    light: "#eef8f1",
    fleck: "#2a2a2a",
  },
  peanut_butter_cup: {
    deep: "#c49a5c",
    mid: "#e2c48a",
    light: "#f3e4c4",
    fleck: "#4a2f1a",
  },
  blueberry_dream: {
    deep: "#8a7ab8",
    mid: "#c4b8dc",
    light: "#ebe4f4",
    fleck: "#4a3a7a",
  },
  lone_wolf: {
    deep: "#5c4033",
    mid: "#8b6a55",
    light: "#d4b8a0",
    fleck: "#c4a882",
  },
  mango_dream: {
    deep: "#e8a84a",
    mid: "#f3c878",
    light: "#fbe8c4",
  },
};

const BASE_YOGURT: Record<string, YogurtPalette> = {
  "nonfat vanilla": {
    deep: "#e8dcc8",
    mid: "#f5efe3",
    light: "#fffaf2",
  },
  "nonfat chocolate": {
    deep: "#6b4a3a",
    mid: "#a07860",
    light: "#d4b8a4",
  },
  half: {
    deep: "#8b6550",
    mid: "#d4c0a8",
    light: "#f5efe3",
  },
  "non-dairy": {
    deep: "#d8d0c4",
    mid: "#ece6dc",
    light: "#faf7f2",
  },
  banana: {
    deep: "#e8d078",
    mid: "#f3e4a8",
    light: "#fbf4d4",
  },
};

type ToppingKind =
  | "berry"
  | "chip"
  | "cookie"
  | "sprinkle"
  | "sauce"
  | "nut"
  | "gummy"
  | "mint"
  | "crumb"
  | "generic";

type ToppingSpec = {
  id: string;
  name: string;
  kind: ToppingKind;
  colors: [string, string];
};

function mixinKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isConeMod(m: CartModifierSelection): boolean {
  return /\bcone\b/i.test(m.name);
}

function isSizeMod(m: CartModifierSelection): boolean {
  return /^(small|medium|large|pint|akid)$/i.test(m.name.trim());
}

function isBaseMod(m: CartModifierSelection): boolean {
  return (
    /\b(nonfat|non-dairy|half|vanilla|chocolate|banana)\b/i.test(m.name) &&
    !/\b(cookie|chips|sauce|strawberr|blueberr|oreo|mint|pretzel|cracker|coconut|nutella|almond butter|heath|mango|cereal|caramel)\b/i.test(
      m.name,
    )
  );
}

function cupStillForOrder(order: AppOrder): string {
  const line = order.lineItems[0];
  if (line) {
    const hit = Object.entries(NAMED_STILL).find(([key]) =>
      line.itemId.includes(key),
    );
    if (hit) return hit[1];
  }
  return MYO_STILL;
}

function namedKeyForOrder(order: AppOrder): string | null {
  const line = order.lineItems[0];
  if (!line) return null;
  const hit = Object.keys(NAMED_YOGURT).find((key) =>
    line.itemId.includes(key),
  );
  return hit ?? null;
}

function yogurtForOrder(order: AppOrder): YogurtPalette {
  const named = namedKeyForOrder(order);
  if (named) return NAMED_YOGURT[named];

  const line: CartLine | undefined = order.lineItems[0];
  const base = line?.modifiers.find(isBaseMod);
  if (base) {
    const key = mixinKey(base.name);
    for (const [k, palette] of Object.entries(BASE_YOGURT)) {
      if (key.includes(k) || k.includes(key)) return palette;
    }
  }
  return BASE_YOGURT["nonfat vanilla"];
}

function toppingKind(name: string): ToppingKind {
  const key = mixinKey(name);
  if (/strawberr|raspberr|blueberr|banana|pineapple|mango/.test(key))
    return "berry";
  if (/oreo|animal cracker|cookie dough|cookie/.test(key)) return "cookie";
  if (/chocolate chip|heath|english toffee|espresso/.test(key)) return "chip";
  if (/sprinkle|granola|cereal|pretzel|coconut/.test(key)) return "sprinkle";
  if (/nutella|peanut butter|almond butter|ganache|caramel|salted caramel/.test(key))
    return "sauce";
  if (/pecan|walnut|pistachio|almond/.test(key)) return "nut";
  if (/gummy/.test(key)) return "gummy";
  if (/jr mint|mint/.test(key)) return "mint";
  if (/crumb|cracker|graham/.test(key)) return "crumb";
  return "generic";
}

function toppingColors(name: string): [string, string] {
  const key = mixinKey(name);
  if (/strawberr/.test(key)) return ["#e23b2e", "#8f1e14"];
  if (/raspberr/.test(key)) return ["#c2185b", "#7b0f38"];
  if (/blueberr/.test(key)) return ["#3d4a9a", "#1e2558"];
  if (/banana/.test(key)) return ["#f0d24a", "#c9a512"];
  if (/pineapple|mango/.test(key)) return ["#f0b429", "#c47e0a"];
  if (/oreo/.test(key)) return ["#1a1a1a", "#f4f0ea"];
  if (/animal cracker|cookie dough|cookie/.test(key))
    return ["#d4a574", "#8b5a2b"];
  if (/chocolate chip|heath|english toffee/.test(key))
    return ["#4a2c1a", "#8b5a2b"];
  if (/rainbow sprinkle/.test(key)) return ["#f84030", "#3d8bfd"];
  if (/sprinkle/.test(key)) return ["#f84030", "#f0b429"];
  if (/granola|pretzel|coconut|cereal/.test(key))
    return ["#c49a5c", "#8b6a3a"];
  if (/nutella|ganache/.test(key)) return ["#4a2a18", "#7a4a28"];
  if (/peanut butter|almond butter/.test(key)) return ["#c49a3c", "#8b6a20"];
  if (/caramel/.test(key)) return ["#c47828", "#8b4e10"];
  if (/pecan|walnut/.test(key)) return ["#8b5a2b", "#5c3a18"];
  if (/pistachio/.test(key)) return ["#8fbf6a", "#5a7a3a"];
  if (/gummy/.test(key)) return ["#f84030", "#3d8bfd"];
  if (/jr mint|mint/.test(key)) return ["#1a6b4a", "#f4f0ea"];
  if (/espresso/.test(key)) return ["#3c2f29", "#6b5348"];
  return ["#c4a07a", "#8b6a55"];
}

function toppingsForOrder(order: AppOrder): ToppingSpec[] {
  const line = order.lineItems[0];
  if (!line) return [];
  return line.modifiers
    .filter((m) => !isConeMod(m) && !isSizeMod(m) && !isBaseMod(m))
    .slice(0, 8)
    .map((m) => ({
      id: m.modifierId,
      name: m.name,
      kind: toppingKind(m.name),
      colors: toppingColors(m.name),
    }));
}

export function CupBuildAnimation({
  order,
  reducedMotion,
  onFinished,
}: {
  order: AppOrder;
  reducedMotion: boolean;
  onFinished: () => void;
}) {
  const still = useMemo(() => cupStillForOrder(order), [order]);
  const yogurt = useMemo(() => yogurtForOrder(order), [order]);
  const toppings = useMemo(() => toppingsForOrder(order), [order]);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (reducedMotion) {
      finishedRef.current();
      return;
    }
    const t = window.setTimeout(() => finishedRef.current(), CUP_BUILD_MS);
    return () => window.clearTimeout(t);
  }, [reducedMotion]);

  const modeClass = reducedMotion
    ? "cup-build--reduced"
    : "cup-build--play";

  return (
    <div
      className={`cup-build ${modeClass}`}
      aria-hidden
      style={
        {
          pointerEvents: "none",
          ["--yogurt-deep" as string]: yogurt.deep,
          ["--yogurt-mid" as string]: yogurt.mid,
          ["--yogurt-light" as string]: yogurt.light,
          ["--yogurt-fleck" as string]: yogurt.fleck ?? "transparent",
          ["--topping-count" as string]: String(Math.max(toppings.length, 1)),
        } as CSSProperties
      }
    >
      <div className="cup-build__counter">
        <div className="cup-build__perspective">
          <div className="cup-build__stage">
            <div className="cup-build__glow" />
            <div className="cup-build__shadow" />

            {/* Soft-serve pour stream */}
            <div className="cup-build__stream" />

            <div className="cup-build__cup">
              <div className="cup-build__rim" />
              <div className="cup-build__wall cup-build__wall--back" />
              <div className="cup-build__wall cup-build__wall--left" />
              <div className="cup-build__wall cup-build__wall--right" />
              <div className="cup-build__wall cup-build__wall--front">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="cup-build__logo"
                  src="/logo.webp"
                  alt=""
                  width={120}
                  height={50}
                />
                <span className="cup-build__since">
                  Family owned · since 2008
                </span>
              </div>

              <div className="cup-build__bowl">
                <div className="cup-build__yogurt">
                  <div className="cup-build__yogurt-mass" />
                  <div className="cup-build__yogurt-ribbon" />
                  <div className="cup-build__yogurt-peak" />
                  <div className="cup-build__yogurt-flecks" />
                </div>
              </div>
            </div>

            <div className="cup-build__toppings">
              {toppings.map((t, i) => (
                <span
                  key={t.id}
                  className={`cup-build__bit cup-build__bit--${t.kind}`}
                  style={
                    {
                      ["--i" as string]: String(i),
                      ["--c1" as string]: t.colors[0],
                      ["--c2" as string]: t.colors[1],
                      ["--n" as string]: String(toppings.length),
                    } as CSSProperties
                  }
                  title={t.name}
                />
              ))}
            </div>

            {/* Final order still — the cup they receive */}
            <div
              className="cup-build__reveal"
              style={{ backgroundImage: `url(${still})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import type { AppOrder, CartLine, CartModifierSelection } from "@/types/menu";

export const CUP_BUILD_MS = 3000;

export type YogurtPalette = {
  deep: string;
  mid: string;
  light: string;
  fleck?: string;
};

export type ToppingKind =
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

export type ToppingSpec = {
  id: string;
  name: string;
  kind: ToppingKind;
  colors: [string, string];
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

function namedKeyForOrder(order: AppOrder): string | null {
  const line = order.lineItems[0];
  if (!line) return null;
  const hit = Object.keys(NAMED_YOGURT).find((key) =>
    line.itemId.includes(key),
  );
  return hit ?? null;
}

/** Named recipes start on vanilla or chocolate before toppings are smashed in. */
const NAMED_BASE: Record<string, keyof typeof BASE_YOGURT> = {
  salty_dog: "nonfat vanilla",
  strawberry_shortcake: "nonfat vanilla",
  thinner_mint: "nonfat chocolate",
  peanut_butter_cup: "nonfat chocolate",
  blueberry_dream: "nonfat vanilla",
  lone_wolf: "nonfat chocolate",
  mango_dream: "nonfat vanilla",
};

function resolveBasePalette(order: AppOrder): YogurtPalette {
  const line: CartLine | undefined = order.lineItems[0];
  const base = line?.modifiers.find(isBaseMod);
  if (base) {
    const key = mixinKey(base.name);
    if (/chocolate/.test(key)) return BASE_YOGURT["nonfat chocolate"];
    if (/half/.test(key)) return BASE_YOGURT.half;
    if (/non-dairy|nondairy/.test(key)) return BASE_YOGURT["non-dairy"];
    if (/banana/.test(key)) return BASE_YOGURT.banana;
    for (const [k, palette] of Object.entries(BASE_YOGURT)) {
      if (key.includes(k) || k.includes(key)) return palette;
    }
  }
  const named = namedKeyForOrder(order);
  if (named && NAMED_BASE[named]) return BASE_YOGURT[NAMED_BASE[named]];
  if (line && /chocolate/i.test(line.itemName)) {
    return BASE_YOGURT["nonfat chocolate"];
  }
  return BASE_YOGURT["nonfat vanilla"];
}

/** Plain yogurt/chocolate before the smash — Loving Cup always starts here. */
export function baseYogurtForOrder(order: AppOrder): YogurtPalette {
  return resolveBasePalette(order);
}

/**
 * Finished cup after toppings are crushed into the base.
 * Named cups get their shop color; MYO tints the base with topping flecks.
 */
export function blendedYogurtForOrder(order: AppOrder): YogurtPalette {
  const named = namedKeyForOrder(order);
  if (named) return NAMED_YOGURT[named];

  const base = resolveBasePalette(order);
  const toppings = toppingsForOrder(order);
  if (!toppings.length) return base;

  const accent = toppings[0].colors[0];
  const accentDeep = toppings[0].colors[1];
  const fleck = toppings.find((t) => t.kind !== "sprinkle")?.colors[0];
  return {
    deep: mixHex(base.deep, accentDeep, 0.28),
    mid: mixHex(base.mid, accent, 0.38),
    light: mixHex(base.light, accent, 0.18),
    fleck: fleck ?? accentDeep,
  };
}

/** @deprecated Prefer baseYogurtForOrder + blendedYogurtForOrder */
export function yogurtForOrder(order: AppOrder): YogurtPalette {
  return blendedYogurtForOrder(order);
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const u = Math.min(1, Math.max(0, t));
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * u);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * u);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * u);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toppingKind(name: string): ToppingKind {
  const key = mixinKey(name);
  if (/strawberr|raspberr|blueberr|banana|pineapple|mango/.test(key))
    return "berry";
  if (/oreo|animal cracker|cookie dough|cookie/.test(key)) return "cookie";
  if (/chocolate chip|heath|english toffee|espresso/.test(key)) return "chip";
  if (/sprinkle|granola|cereal|pretzel|coconut/.test(key)) return "sprinkle";
  if (
    /nutella|peanut butter|almond butter|ganache|caramel|salted caramel/.test(
      key,
    )
  )
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

export function toppingsForOrder(order: AppOrder): ToppingSpec[] {
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

/** Expand into renderable bits (extra sprinkles / berry halves). */
export function expandToppingBits(
  toppings: ToppingSpec[],
): Array<ToppingSpec & { bitKey: string; seed: number }> {
  const bits: Array<ToppingSpec & { bitKey: string; seed: number }> = [];
  let seed = 0;
  for (const t of toppings) {
    bits.push({ ...t, bitKey: t.id, seed: seed++ });
    if (t.kind === "sprinkle") {
      bits.push(
        {
          ...t,
          bitKey: `${t.id}-b`,
          colors: ["#f0b429", "#3d8bfd"],
          seed: seed++,
        },
        {
          ...t,
          bitKey: `${t.id}-c`,
          colors: ["#3d8bfd", "#f84030"],
          seed: seed++,
        },
        {
          ...t,
          bitKey: `${t.id}-d`,
          colors: ["#2ecc71", "#f84030"],
          seed: seed++,
        },
      );
    }
    if (t.kind === "berry" || t.kind === "cookie" || t.kind === "mint") {
      bits.push({ ...t, bitKey: `${t.id}-b`, seed: seed++ });
    }
    if (t.kind === "chip") {
      bits.push({ ...t, bitKey: `${t.id}-b`, seed: seed++ });
    }
  }
  return bits.slice(0, 14);
}

export type BuildPhase = "cup" | "pour" | "toppings" | "blend" | "reveal";

export function phaseAt(ms: number): BuildPhase {
  if (ms < 450) return "cup";
  if (ms < 1100) return "pour";
  if (ms < 1700) return "toppings";
  if (ms < 2550) return "blend";
  return "reveal";
}

/** Smooth 0–1 progress within the full build. */
export function buildProgress(ms: number): number {
  return Math.min(1, Math.max(0, ms / CUP_BUILD_MS));
}

/**
 * Demo/POC catalog — labeled sample data, gated off the live Square path.
 *
 * Mirrors live Square Catalog pricing model (NOT the /menu JPEG totals):
 *   Cup base $4.99 + size modifiers:
 *     Kid +$0 · Small +$1.01 · Medium +$2.01 · Large +$3.01 · Pint +$7.01
 *   Extra mix-in +$0.75 · Cone +$1.25
 * Never hardcode $6 / $7 / $8 / $12 as variation prices.
 *
 * One mix-in chip list (toasted coconut once). `akid` sold out. No apizza SKUs.
 * Out of this pass: missing printed flavors + rice pudding (not invented here).
 */

import { normalizeMenuItem } from "@/lib/normalize-modifiers";
import type {
  CatalogPayload,
  MenuItem,
  MenuModifierList,
  MenuVariation,
} from "@/types/menu";

const USD = (cents: number) => ({ amount: cents, currency: "USD" as const });

/** Single catalog variation — cup base from Square model. */
const CUP_VARIATION: MenuVariation = {
  id: "var_cup",
  name: "Cup",
  sku: "cup-base",
  price: USD(499),
  ordinal: 0,
};

/**
 * Size modifiers from live Square walk-through.
 * Resulting totals (base + mod) are informational only — UI shows base + modifier amounts.
 */
const SIZE_MODIFIERS = [
  { key: "kid", name: "Kid", cents: 0 },
  { key: "small", name: "Small", cents: 101 },
  { key: "medium", name: "Medium", cents: 201 },
  { key: "large", name: "Large", cents: 301 },
  { key: "pint", name: "Pint", cents: 701 },
] as const;

const BASES = [
  "Nonfat Tart",
  "Nonfat Vanilla",
  "Nonfat Chocolate",
  "Dairy-Free Coconut",
];

/** One mix-in sheet — toasted coconut once (not duplicated grids). */
const MIX_INS = [
  "Fresh Strawberries",
  "Blueberries",
  "Banana",
  "Oreo Cookie",
  "Graham Cracker",
  "Chocolate Chips",
  "Caramel Sauce",
  "Hot Fudge",
  "Sprinkles",
  "Almonds",
  "Toasted Coconut",
  "Gummy Bears",
];

function sizeList(itemKey: string): MenuModifierList {
  return {
    id: `ml_${itemKey}_size`,
    name: "Size",
    role: "size",
    selectionType: "SINGLE",
    minSelected: 1,
    maxSelected: 1,
    modifiers: SIZE_MODIFIERS.map((s, i) => ({
      id: `mod_${itemKey}_size_${s.key}`,
      name: s.name,
      price: USD(s.cents),
      ordinal: i,
    })),
  };
}

function baseList(itemKey: string): MenuModifierList {
  return {
    id: `ml_${itemKey}_base`,
    name: "Base",
    role: "base",
    selectionType: "SINGLE",
    minSelected: 1,
    maxSelected: 1,
    modifiers: BASES.map((name, i) => ({
      id: `mod_${itemKey}_base_${i}`,
      name,
      price: USD(0),
      ordinal: i,
    })),
  };
}

function mixinList(
  itemKey: string,
  opts?: { includedCount?: number; name?: string },
): MenuModifierList {
  const included = opts?.includedCount ?? 0;
  return {
    id: `ml_${itemKey}_mixin`,
    name: opts?.name ?? (included > 0 ? `Mix-ins (${included} included)` : "Mix-ins"),
    role: "mixin",
    selectionType: "MULTIPLE",
    minSelected: 0,
    maxSelected: 10,
    includedCount: included > 0 ? included : undefined,
    modifiers: MIX_INS.map((name, i) => ({
      id: `mod_${itemKey}_mixin_${i}`,
      name,
      price: USD(75),
      ordinal: i,
    })),
  };
}

function coneList(itemKey: string): MenuModifierList {
  return {
    id: `ml_${itemKey}_cone`,
    name: "Cone",
    role: "cone",
    selectionType: "SINGLE",
    minSelected: 0,
    maxSelected: 1,
    modifiers: [
      {
        id: `mod_${itemKey}_cone`,
        name: "Sugar cone",
        price: USD(125),
        ordinal: 0,
      },
    ],
  };
}

function cupSheets(itemKey: string, cyob = false): MenuModifierList[] {
  return [
    sizeList(itemKey),
    baseList(itemKey),
    mixinList(itemKey, cyob ? { includedCount: 2 } : undefined),
    coneList(itemKey),
  ];
}

/** Sample signature names for demo only — not filling the 7 missing printed flavors. */
const SIGNATURE_NAMES = [
  "Berry Bliss",
  "Cookies & Cream Dream",
  "Chocolate Avalanche",
  "Strawberry Fields",
  "Banana Split Cup",
  "Caramel Crunch",
  "Mint Chip Moment",
  "PB Cup Crush",
  "Tropical Twirl",
  "S'mores Scoop",
  "Lemon Berry Bright",
  "Coffee Toffee",
  "Matcha Berry",
  "Rainbow Sprinkle",
  "Dark Cocoa Crush",
];

function signatureItem(name: string, index: number): MenuItem {
  const key = `sig_${index}`;
  return normalizeMenuItem({
    id: `item_${key}`,
    name,
    description:
      "Signature cup (demo). Base $4.99 + size modifiers from the Square model.",
    categoryIds: ["cat_signature"],
    categoryNames: ["Signature Cups"],
    variations: [
      {
        ...CUP_VARIATION,
        id: `var_cup_${key}`,
        sku: `cup-${key}`,
      },
    ],
    modifierLists: cupSheets(key),
    soldOut: false,
  });
}

const AKID: MenuItem = normalizeMenuItem({
  id: "item_akid",
  name: "akid",
  description: "Sold out — cannot be ordered.",
  categoryIds: ["cat_signature"],
  categoryNames: ["Signature Cups"],
  variations: [
    {
      id: "var_akid",
      name: "Cup",
      sku: "akid",
      price: USD(499),
      ordinal: 0,
    },
  ],
  modifierLists: cupSheets("akid"),
  soldOut: true,
});

const CYOB: MenuItem = normalizeMenuItem({
  id: "item_cyob",
  name: "Create Your Own Bowl (CYOB)",
  description:
    "Demo CYOB. Base $4.99 + size mods. 2 mix-ins included; extras +$0.75; cone +$1.25.",
  categoryIds: ["cat_cyob"],
  categoryNames: ["CYOB"],
  variations: [
    {
      ...CUP_VARIATION,
      id: "var_cup_cyob",
      sku: "cup-cyob",
    },
  ],
  modifierLists: cupSheets("cyob", true),
  soldOut: false,
});

export const DEMO_CATALOG_DISCOUNT = {
  id: "demo_discount_rewards",
  name: "Rewards redeem (demo)",
  discountCents: 200,
};

export function getDemoCatalog(): CatalogPayload {
  const items: MenuItem[] = [
    ...SIGNATURE_NAMES.map((n, i) => signatureItem(n, i)),
    CYOB,
    AKID,
  ];

  return {
    mode: "demo",
    locationId: "DEMO_NOPA",
    categories: [
      { id: "cat_signature", name: "Signature Cups", ordinal: 0 },
      { id: "cat_cyob", name: "CYOB", ordinal: 1 },
    ],
    items,
    fetchedAt: new Date().toISOString(),
  };
}

/** Line-item modifier price for CYOB: first `includedCount` free, then catalog price. */
export function pricedModifiersForLine(
  modifierList: MenuModifierList,
  selectedModifierIds: string[],
): { modifierId: string; name: string; priceCents: number }[] {
  const selected = modifierList.modifiers.filter((m) =>
    selectedModifierIds.includes(m.id),
  );
  const included = modifierList.includedCount ?? 0;
  return selected.map((m, index) => ({
    modifierId: m.id,
    name: m.name,
    priceCents: index < included ? 0 : m.price.amount,
  }));
}

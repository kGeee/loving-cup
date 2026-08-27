/**
 * Demo/POC catalog — labeled sample data, gated off the live Square path.
 *
 * Mirrors live Square Make Your Own (item=232) pricing — NOT the /menu JPEG totals:
 *   Cup base $4.99 + size modifiers (Required, select one):
 *     akid size (Sold out) · Small +$1.01 · Medium +$2.01 · Large +$3.01 · Pint +$7.01
 *   Mix-ins: ONE chip list (design lock; Square Online has two ~30 grids — we don't clone that)
 *   Extra mix-in +$0.75 · Cone +$1.25 · toasted coconut once
 *
 * `akid` is a sold-out SIZE MODIFIER, not a standalone menu item.
 * Out of this pass: rice pudding + 7 printed-only flavors (monster cookie, butterfinger,
 * mocha chip, peanut butter cup, power cup, brownie obsessed, matcha).
 */

import { normalizeMenuItem } from "@/lib/normalize-modifiers";
import type {
  CatalogPayload,
  MenuItem,
  MenuModifierList,
  MenuVariation,
} from "@/types/menu";

const USD = (cents: number) => ({ amount: cents, currency: "USD" as const });

const CUP_VARIATION: MenuVariation = {
  id: "var_cup",
  name: "Cup",
  sku: "cup-base",
  price: USD(499),
  ordinal: 0,
};

/** Live Square size sheet on Make Your Own — akid sold out. */
const SIZE_MODIFIERS = [
  { key: "akid", name: "akid", cents: 0, soldOut: true },
  { key: "small", name: "Small", cents: 101, soldOut: false },
  { key: "medium", name: "Medium", cents: 201, soldOut: false },
  { key: "large", name: "Large", cents: 301, soldOut: false },
  { key: "pint", name: "Pint", cents: 701, soldOut: false },
] as const;

const BASES = [
  "Nonfat Tart",
  "Nonfat Vanilla",
  "Nonfat Chocolate",
  "Dairy-Free Coconut",
];

/** One mix-in sheet — toasted coconut once (not Square's duplicated free-list entry). */
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
      soldOut: s.soldOut,
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

function mixinList(itemKey: string): MenuModifierList {
  return {
    id: `ml_${itemKey}_mixin`,
    name: "Mix-ins",
    role: "mixin",
    selectionType: "MULTIPLE",
    minSelected: 0,
    maxSelected: 10,
    // Design-lock CYOB: 2 included; extras beyond that use catalog +$0.75.
    includedCount: 2,
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

function cupSheets(itemKey: string): MenuModifierList[] {
  return [
    sizeList(itemKey),
    baseList(itemKey),
    mixinList(itemKey),
    coneList(itemKey),
  ];
}

/**
 * Sample signature names for demo only.
 * Deliberately excludes the 7 printed-only flavors not on the online catalog.
 */
const SIGNATURE_NAMES = [
  "Berry Bliss",
  "Cookies & Cream Dream",
  "Chocolate Avalanche",
  "Strawberry Fields",
  "Banana Split Cup",
  "Caramel Crunch",
  "Mint Chip Moment",
  "Tropical Twirl",
  "S'mores Scoop",
  "Lemon Berry Bright",
  "Coffee Toffee",
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

/** Mirrors Square Make Your Own (item=232) — not a delivery-walled /s/order clone. */
const MAKE_YOUR_OWN: MenuItem = normalizeMenuItem({
  id: "item_make_your_own",
  name: "Make Your Own",
  description:
    "Demo Make Your Own. Base $4.99 + size mods (akid sold out). One mix-in chip list; 2 included; cone +$1.25.",
  categoryIds: ["cat_cyob"],
  categoryNames: ["Make Your Own"],
  variations: [
    {
      ...CUP_VARIATION,
      id: "var_cup_myo",
      sku: "cup-myo",
    },
  ],
  modifierLists: cupSheets("myo"),
  soldOut: false,
});

export const DEMO_CATALOG_DISCOUNT = {
  id: "demo_discount_rewards",
  name: "Rewards redeem (demo)",
  discountCents: 200,
};

export function getDemoCatalog(): CatalogPayload {
  // No standalone `akid` menu row — akid lives only as a sold-out size modifier.
  const items: MenuItem[] = [
    MAKE_YOUR_OWN,
    ...SIGNATURE_NAMES.map((n, i) => signatureItem(n, i)),
  ];

  return {
    mode: "demo",
    locationId: "DEMO_NOPA",
    categories: [
      { id: "cat_cyob", name: "Make Your Own", ordinal: 0 },
      { id: "cat_signature", name: "Signature Cups", ordinal: 1 },
    ],
    items,
    fetchedAt: new Date().toISOString(),
  };
}

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

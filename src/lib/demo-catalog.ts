/**
 * Demo/POC catalog — sample data only, prices locked to the brief's live Square prices.
 * Kid $4.99 / S $6 / M $7 / L $8 / Pint $12 · extra mix-in +$0.75 · cone $1.25
 * No apizza SKUs. `akid` sold out.
 */

import type {
  CatalogPayload,
  MenuItem,
  MenuModifierList,
  MenuVariation,
} from "@/types/menu";

const USD = (cents: number) => ({ amount: cents, currency: "USD" as const });

const SIZE_VARIATIONS: MenuVariation[] = [
  { id: "var_kid", name: "Kid", price: USD(499), ordinal: 0, sku: "size-kid" },
  { id: "var_s", name: "S", price: USD(600), ordinal: 1, sku: "size-s" },
  { id: "var_m", name: "M", price: USD(700), ordinal: 2, sku: "size-m" },
  { id: "var_l", name: "L", price: USD(800), ordinal: 3, sku: "size-l" },
  { id: "var_pint", name: "Pint", price: USD(1200), ordinal: 4, sku: "size-pint" },
];

const BASES = [
  "Nonfat Tart",
  "Nonfat Vanilla",
  "Nonfat Chocolate",
  "Dairy-Free Coconut",
];

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
  "Coconut Flakes",
  "Gummy Bears",
];

function cupModifierLists(itemKey: string): MenuModifierList[] {
  return [
    {
      id: `ml_${itemKey}_base`,
      name: "Base",
      selectionType: "SINGLE",
      minSelected: 1,
      maxSelected: 1,
      modifiers: BASES.map((name, i) => ({
        id: `mod_${itemKey}_base_${i}`,
        name,
        price: USD(0),
        ordinal: i,
      })),
    },
    {
      id: `ml_${itemKey}_extra`,
      name: "Extra mix-in",
      selectionType: "MULTIPLE",
      minSelected: 0,
      maxSelected: 8,
      modifiers: MIX_INS.map((name, i) => ({
        id: `mod_${itemKey}_extra_${i}`,
        name,
        price: USD(75),
        ordinal: i,
      })),
    },
    {
      id: `ml_${itemKey}_cone`,
      name: "Cone",
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
    },
  ];
}

function cyobModifierLists(): MenuModifierList[] {
  return [
    {
      id: "ml_cyob_base",
      name: "Base",
      selectionType: "SINGLE",
      minSelected: 1,
      maxSelected: 1,
      modifiers: BASES.map((name, i) => ({
        id: `mod_cyob_base_${i}`,
        name,
        price: USD(0),
        ordinal: i,
      })),
    },
    {
      id: "ml_cyob_mixin",
      name: "Mix-ins (2 included)",
      selectionType: "MULTIPLE",
      minSelected: 0,
      maxSelected: 10,
      includedCount: 2,
      modifiers: MIX_INS.map((name, i) => ({
        id: `mod_cyob_mixin_${i}`,
        name,
        // Listed at +$0.75; pricing applies only beyond includedCount.
        price: USD(75),
        ordinal: i,
      })),
    },
    {
      id: "ml_cyob_cone",
      name: "Cone",
      selectionType: "SINGLE",
      minSelected: 0,
      maxSelected: 1,
      modifiers: [
        {
          id: "mod_cyob_cone",
          name: "Sugar cone",
          price: USD(125),
          ordinal: 0,
        },
      ],
    },
  ];
}

/** Sample signature cup names for demo only — not a live Square dump. */
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
  return {
    id: `item_${key}`,
    name,
    description: "Signature cup — sample demo item. Customize size, base, extras, cone.",
    categoryIds: ["cat_signature"],
    categoryNames: ["Signature Cups"],
    variations: SIZE_VARIATIONS.map((v) => ({
      ...v,
      id: `${v.id}_${key}`,
      sku: `${v.sku}-${key}`,
    })),
    modifierLists: cupModifierLists(key),
    soldOut: false,
  };
}

const AKID: MenuItem = {
  id: "item_akid",
  name: "akid",
  description: "Sold out — cannot be ordered.",
  categoryIds: ["cat_signature"],
  categoryNames: ["Signature Cups"],
  variations: [
    {
      id: "var_akid",
      name: "Kid",
      sku: "akid",
      price: USD(499),
      ordinal: 0,
    },
  ],
  modifierLists: cupModifierLists("akid"),
  soldOut: true,
};

const CYOB: MenuItem = {
  id: "item_cyob",
  name: "Create Your Own Bowl (CYOB)",
  description:
    "2 mix-ins included. Extra mix-ins +$0.75 each. Cone +$1.25. Sample demo item.",
  categoryIds: ["cat_cyob"],
  categoryNames: ["CYOB"],
  variations: SIZE_VARIATIONS.map((v) => ({
    ...v,
    id: `${v.id}_cyob`,
    sku: `${v.sku}-cyob`,
  })),
  modifierLists: cyobModifierLists(),
  soldOut: false,
};

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

/** Line-item modifier price for CYOB: first `includedCount` free, then +$0.75. */
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

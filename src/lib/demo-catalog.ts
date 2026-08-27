/**
 * Shop-true demo catalog — mirrors live Square alovingcup NOPA menu.
 *
 * Orderable named cups (9) + Make Your Own; 7 printed flavors sold-out (visible, no price).
 * Pricing: Cup base $4.99 + size mods (akid not a row) · MYO bases · mix-ins 2 included / extras +$0.75 · cone +$1.25
 * Never JPEG $6/$7/$8/$12 variation hardcodes.
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

/**
 * Size sheet — akid is sold out and is NOT a selectable row.
 * Small +$1.01 · Medium +$2.01 · Large +$3.01 · Pint +$7.01
 */
const SIZE_MODIFIERS = [
  { key: "small", name: "Small", cents: 101 },
  { key: "medium", name: "Medium", cents: 201 },
  { key: "large", name: "Large", cents: 301 },
  { key: "pint", name: "Pint", cents: 701 },
] as const;

/** MYO bases: nonfat vanilla / chocolate / half included; non-dairy and banana +$0.50 */
const BASES = [
  { name: "Nonfat Vanilla", cents: 0 },
  { name: "Nonfat Chocolate", cents: 0 },
  { name: "Half", cents: 0 },
  { name: "Non-dairy", cents: 50 },
  { name: "Banana", cents: 50 },
] as const;

/** One mix-in chip list — toasted coconut once. First 2 included; extras +$0.75. */
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
  "Nutella",
  "Peanut Butter",
  "Animal Crackers",
  "Pretzels",
  "Jr Mints",
] as const;

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
    modifiers: BASES.map((b, i) => ({
      id: `mod_${itemKey}_base_${i}`,
      name: b.name,
      price: USD(b.cents),
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
    includedCount: 2,
    modifiers: MIX_INS.map((name, i) => ({
      id: `mod_${itemKey}_mixin_${i}`,
      name,
      // Catalog price for extras beyond includedCount; UI does not label the 2 included.
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

/** Named cups: size sheet only (no mix-in / base / cone sheet). */
function namedCupSheets(itemKey: string): MenuModifierList[] {
  return [sizeList(itemKey)];
}

/** Make Your Own: size, base, 2 included mix-ins then extra +$0.75, cone +$1.25. */
function myoSheets(itemKey: string): MenuModifierList[] {
  return [
    sizeList(itemKey),
    baseList(itemKey),
    mixinList(itemKey),
    coneList(itemKey),
  ];
}

type NamedCup = {
  key: string;
  name: string;
  /** Ingredients from Square / shop; blank rather than invent. */
  ingredients: string;
  imageUrl?: string;
};

/** Live Square alovingcup orderable named cups (these nine only, plus MYO). */
const ORDERABLE_CUPS: NamedCup[] = [
  {
    key: "mango_dream",
    name: "Mango Dream",
    ingredients: "Vanilla + Mango",
  },
  {
    key: "lone_wolf",
    name: "Lone Wolf",
    ingredients: "Chocolate + Almond Butter + Heath Bar",
  },
  {
    key: "salty_dog",
    name: "Salty Dog",
    ingredients: "Vanilla + Salted Caramel + Pretzels",
    imageUrl: "/cup-salty-dog.webp",
  },
  {
    key: "blueberry_dream",
    name: "Blueberry Dream",
    ingredients: "Vanilla + Blueberries + Toasted Coconut",
  },
  {
    key: "dirty_hipster",
    name: "Dirty Hipster",
    ingredients: "Vanilla + Nutella + Oreos",
  },
  {
    key: "strawberry_shortcake",
    name: "Strawberry Shortcake",
    ingredients: "Vanilla + Strawberries + Animal Crackers",
    imageUrl: "/cup-strawberry-shortcake.webp",
  },
  {
    key: "thinner_mint",
    name: "Thinner Mint",
    ingredients: "Vanilla + Oreos + Junior Mints",
    imageUrl: "/cup-thinner-mint.webp",
  },
  {
    key: "crunchy_cereal",
    name: "Crunchy Cereal",
    ingredients: "Vanilla + House Made Crunchy Cereals + Salted Caramel Sauce",
  },
];

/**
 * 7 printed flavors not in Square — sold out, no prices, cannot add to cart.
 * Kept visible on the menu; never hidden by catalog-filter.
 */
const PRINTED_SOLD_OUT: NamedCup[] = [
  {
    key: "monster_cookie",
    name: "Monster Cookie",
    ingredients: "Vanilla + Cookie Dough + Oreos",
  },
  {
    key: "butterfinger",
    name: "Butterfinger",
    ingredients: "Vanilla + Peanut Butter + Heath Bar",
  },
  {
    key: "matcha",
    name: "Matcha",
    ingredients: "Vanilla + Organic Matcha",
  },
  {
    key: "mocha_chip",
    name: "Mocha Chip",
    ingredients: "Chocolate + Espresso + Chocolate Chips",
  },
  {
    key: "peanut_butter_cup",
    name: "Peanut Butter Cup",
    ingredients: "Vanilla + Peanut Butter + Chocolate Chips",
    imageUrl: "/cup-peanut-butter-cup.webp",
  },
  {
    key: "power_cup",
    name: "Power Cup",
    ingredients: "Chocolate + Almond Butter + Bananas",
  },
  {
    key: "brownie_obsessed",
    name: "Brownie Obsessed",
    ingredients: "Chocolate + Brownies",
  },
];

function orderableNamedCup(cup: NamedCup): MenuItem {
  return normalizeMenuItem({
    id: `item_${cup.key}`,
    name: cup.name,
    description: cup.ingredients || undefined,
    categoryIds: ["cat_alovingcup"],
    categoryNames: ["alovingcup"],
    variations: [
      {
        ...CUP_VARIATION,
        id: `var_cup_${cup.key}`,
        sku: `cup-${cup.key}`,
      },
    ],
    modifierLists: namedCupSheets(cup.key),
    soldOut: false,
    imageUrl: cup.imageUrl,
  });
}

function printedSoldOutCup(cup: NamedCup): MenuItem {
  // Sold-out printed rows: no orderable variation price for the menu UI.
  return normalizeMenuItem({
    id: `item_${cup.key}`,
    name: cup.name,
    description: cup.ingredients || undefined,
    categoryIds: ["cat_alovingcup"],
    categoryNames: ["alovingcup"],
    variations: [
      {
        id: `var_cup_${cup.key}`,
        name: "Cup",
        sku: `cup-${cup.key}`,
        // Price present for type shape only; MenuGrid omits price when soldOut.
        price: USD(499),
        ordinal: 0,
      },
    ],
    modifierLists: [],
    soldOut: true,
    imageUrl: cup.imageUrl,
  });
}

const MAKE_YOUR_OWN: MenuItem = normalizeMenuItem({
  id: "item_make_your_own",
  name: "Make Your Own",
  description: undefined,
  categoryIds: ["cat_cyob"],
  categoryNames: ["Make Your Own"],
  variations: [
    {
      ...CUP_VARIATION,
      id: "var_cup_myo",
      sku: "cup-myo",
    },
  ],
  modifierLists: myoSheets("myo"),
  soldOut: false,
});

export const DEMO_CATALOG_DISCOUNT = {
  id: "demo_discount_rewards",
  name: "Rewards redeem (demo)",
  discountCents: 200,
};

export function getDemoCatalog(): CatalogPayload {
  const items: MenuItem[] = [
    ...ORDERABLE_CUPS.map(orderableNamedCup),
    MAKE_YOUR_OWN,
    ...PRINTED_SOLD_OUT.map(printedSoldOutCup),
  ];

  return {
    mode: "demo",
    locationId: "DEMO_NOPA",
    categories: [
      { id: "cat_alovingcup", name: "alovingcup", ordinal: 0 },
      { id: "cat_cyob", name: "Make Your Own", ordinal: 1 },
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

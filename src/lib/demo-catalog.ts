/**
 * Shop-true demo catalog — mirrors live Square alovingcup NOPA menu.
 *
 * Orderable named cups (8) + Make Your Own; 7 printed flavors sold-out (visible, no price).
 * Named cups: size (required) → mix-ins (recipe locked included + extras +$0.75) → cone +$1.25.
 * MYO: size, base, mix-ins (first 2 selected free / extras +$0.75), cone +$1.25.
 * Never JPEG $6/$7/$8/$12 variation hardcodes. Never POST demo IDs on the live Square path.
 */

import { normalizeMenuItem } from "@/lib/normalize-modifiers";
import type {
  CatalogPayload,
  MenuItem,
  MenuModifier,
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

/**
 * Printed mix-in chips (25 = 13 Square + 12 nosku). Extras +$0.75.
 * Square-subset names stay orderable with demo SKU ids.
 * The 12 board-only names below are grey (`noSku`) — demo still +$0.75; never POST live.
 * Unmapped recipe names (Mango, Heath Bar, …) are locked chips on their cup only.
 */
const SQUARE_MIX_INS = [
  "Strawberries",
  "Blueberries",
  "Bananas",
  "Oreos",
  "Chocolate Chips",
  "Rainbow Sprinkles",
  "Toasted Coconut",
  "Gummy Bears",
  "Nutella",
  "Peanut Butter",
  "Animal Crackers",
  "Pretzels",
  "Jr Mints",
] as const;

/** Board-only printed names — no Square modifier. Do not invent beyond this list. */
const NOSKU_MIX_INS = [
  "Almond Butter",
  "Cookie Dough",
  "English Toffee",
  "Espresso",
  "Granola",
  "Pecans",
  "Pineapple",
  "Pistachios",
  "Raspberries",
  "Walnuts",
  "Ganache",
  "Salted Caramel",
] as const;

const MIX_INS = [...SQUARE_MIX_INS, ...NOSKU_MIX_INS] as const;

const NOSKU_KEYS = new Set(NOSKU_MIX_INS.map((n) => n.toLowerCase()));

/** Recipe ingredient → printed MIX_INS name when the chip already exists. */
const RECIPE_ALIASES: Record<string, (typeof MIX_INS)[number]> = {
  // Dirty Hipster / Thinner Mint / Monster Cookie: Oreos → Oreos (locked w/ Nutella).
  oreos: "Oreos",
  oreo: "Oreos",
  "oreo cookie": "Oreos",
  "jr mints": "Jr Mints",
  "junior mints": "Jr Mints",
  "fresh strawberries": "Strawberries",
  strawberries: "Strawberries",
  banana: "Bananas",
  bananas: "Bananas",
  sprinkles: "Rainbow Sprinkles",
  "rainbow sprinkles": "Rainbow Sprinkles",
  // Salted Caramel aliases over Caramel Sauce (Salty Dog / Crunchy Cereal).
  "caramel sauce": "Salted Caramel",
  "salted caramel sauce": "Salted Caramel",
  "salted caramel": "Salted Caramel",
  pretzels: "Pretzels",
  blueberries: "Blueberries",
  "toasted coconut": "Toasted Coconut",
  nutella: "Nutella",
  "animal crackers": "Animal Crackers",
  "almond butter": "Almond Butter",
  "cookie dough": "Cookie Dough",
  espresso: "Espresso",
};

/** Yogurt bases in the ingredient line — not mix-in chips. */
const BASE_INGREDIENT = /^(vanilla|chocolate|nonfat\s+vanilla|nonfat\s+chocolate|half|non-dairy|banana)$/i;

function normKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Pull mix-in tokens from "Vanilla + Oreos + Junior Mints" (skip yogurt base). */
export function recipeMixinsFromIngredients(ingredients: string): string[] {
  return ingredients
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !BASE_INGREDIENT.test(normKey(s)))
    .map((s) => {
      const key = normKey(s);
      return RECIPE_ALIASES[key] ?? s.trim();
    });
}

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

function myoMixinList(itemKey: string): MenuModifierList {
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
      price: USD(75),
      ordinal: i,
      noSku: NOSKU_KEYS.has(name.toLowerCase()) || undefined,
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

/**
 * Named-cup mix-ins: printed chips at +$0.75; locked recipe IDs included ($0).
 * Unmapped recipe names become locked chips on this cup only (not global extras).
 * No MYO includedCount — only recipeMixinIds are free.
 */
function namedMixinList(
  itemKey: string,
  recipeNames: string[],
): { list: MenuModifierList; recipeMixinIds: string[] } {
  const recipeMixinIds: string[] = [];
  const mods: MenuModifier[] = [];
  let ordinal = 0;

  for (const name of recipeNames) {
    const key = normKey(name);
    const printed = MIX_INS.find((n) => normKey(n) === key);
    const display = printed ?? name;
    const id = printed
      ? `mod_${itemKey}_mixin_${MIX_INS.indexOf(printed)}`
      : `mod_${itemKey}_recipe_${key.replace(/\s+/g, "_")}`;
    if (recipeMixinIds.includes(id)) continue;
    recipeMixinIds.push(id);
    mods.push({
      id,
      name: display,
      price: USD(0),
      ordinal: ordinal++,
      noSku: printed
        ? NOSKU_KEYS.has(printed.toLowerCase()) || undefined
        : true,
    });
  }

  for (let i = 0; i < MIX_INS.length; i++) {
    const name = MIX_INS[i];
    const id = `mod_${itemKey}_mixin_${i}`;
    if (recipeMixinIds.includes(id)) continue;
    if (mods.some((m) => normKey(m.name) === normKey(name))) continue;
    mods.push({
      id,
      name,
      price: USD(75),
      ordinal: ordinal++,
      noSku: NOSKU_KEYS.has(name.toLowerCase()) || undefined,
    });
  }

  return {
    recipeMixinIds,
    list: {
      id: `ml_${itemKey}_mixin`,
      name: "Mix-ins",
      role: "mixin",
      selectionType: "MULTIPLE",
      minSelected: recipeMixinIds.length,
      maxSelected: 10,
      // Named cups do NOT use MYO's first-2-free; only recipeMixinIds are included.
      modifiers: mods,
    },
  };
}

/** Named cups: size → mix-ins → cone. No base picker. */
function namedCupSheets(
  itemKey: string,
  recipeNames: string[],
): { lists: MenuModifierList[]; recipeMixinIds: string[] } {
  const { list, recipeMixinIds } = namedMixinList(itemKey, recipeNames);
  return {
    recipeMixinIds,
    lists: [sizeList(itemKey), list, coneList(itemKey)],
  };
}

function myoSheets(itemKey: string): MenuModifierList[] {
  return [
    sizeList(itemKey),
    baseList(itemKey),
    myoMixinList(itemKey),
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

/** Live Square alovingcup orderable named cups (these eight + MYO). */
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
    imageUrl: "/cup-lone-wolf.webp",
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
    imageUrl: "/cup-blueberry-dream.webp",
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
  const recipeNames = recipeMixinsFromIngredients(cup.ingredients);
  const { lists, recipeMixinIds } = namedCupSheets(cup.key, recipeNames);
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
    modifierLists: lists,
    soldOut: false,
    imageUrl: cup.imageUrl,
    recipeMixinIds,
  });
}

function printedSoldOutCup(cup: NamedCup): MenuItem {
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

/**
 * Price selected mix-ins.
 * - Named cups with recipeMixinIds: only those IDs are $0; every other selected chip pays catalog price.
 * - MYO (includedCount): first N selected are free (selection order).
 */
export function pricedModifiersForLine(
  modifierList: MenuModifierList,
  selectedModifierIds: string[],
  recipeMixinIds?: string[],
): { modifierId: string; name: string; priceCents: number }[] {
  const selected = modifierList.modifiers.filter((m) =>
    selectedModifierIds.includes(m.id),
  );

  if (recipeMixinIds && recipeMixinIds.length > 0) {
    const locked = new Set(recipeMixinIds);
    return selected.map((m) => ({
      modifierId: m.id,
      name: m.name,
      priceCents: locked.has(m.id) ? 0 : m.price.amount,
    }));
  }

  const included = modifierList.includedCount ?? 0;
  return selected.map((m, index) => ({
    modifierId: m.id,
    name: m.name,
    priceCents: index < included ? 0 : m.price.amount,
  }));
}

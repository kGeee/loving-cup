/** Shared menu types — prices always from Square Catalog (demo mirrors that model). */

export type MoneyCents = number;

export interface MenuMoney {
  amount: MoneyCents;
  currency: "USD";
}

export type ModifierListRole = "size" | "base" | "mixin" | "cone" | "other";

export interface MenuModifier {
  id: string;
  name: string;
  price: MenuMoney;
  ordinal?: number;
  /** e.g. size `akid` — sold out, cannot select / order. */
  soldOut?: boolean;
  /**
   * Printed chip with no Square Catalog modifier.
   * Grey in UI; demo still charges +$0.75; never POST to live Square.
   */
  noSku?: boolean;
}

export interface MenuModifierList {
  id: string;
  name: string;
  role: ModifierListRole;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  maxSelected: number | null;
  /** How many selections are included in the base price (CYOB = 2 mix-ins). */
  includedCount?: number;
  modifiers: MenuModifier[];
}

export interface MenuVariation {
  id: string;
  name: string;
  sku?: string;
  price: MenuMoney;
  ordinal?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  categoryIds: string[];
  categoryNames: string[];
  /** Catalog variation(s) — cup base price lives here ($4.99), not JPEG size totals. */
  variations: MenuVariation[];
  modifierLists: MenuModifierList[];
  /** Item-level sold out (rare). Prefer modifier.soldOut for size `akid`. */
  soldOut: boolean;
  imageUrl?: string;
  /**
   * Named-cup locked recipe mix-in modifier IDs (included).
   * When set, pricing uses these IDs only — not MYO’s first-N-selected-free.
   * Demo catalog only; live Square never invents demo modifier IDs.
   */
  recipeMixinIds?: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  ordinal?: number;
}

export interface CatalogPayload {
  mode: "square" | "demo";
  locationId: string | null;
  categories: MenuCategory[];
  items: MenuItem[];
  fetchedAt: string;
}

export interface CartModifierSelection {
  modifierListId: string;
  modifierId: string;
  name: string;
  priceCents: MoneyCents;
  /** Printed-only chip — strip before live Square CreateOrder. */
  noSku?: boolean;
}

export interface CartLine {
  lineId: string;
  itemId: string;
  itemName: string;
  variationId: string;
  variationName: string;
  quantity: number;
  unitPriceCents: MoneyCents;
  modifiers: CartModifierSelection[];
  note?: string;
}

export type OrderStatus =
  | "OPEN"
  | "PAID"
  | "READY"
  | "COMPLETED"
  | "CANCELED";

export interface AppOrder {
  id: string;
  mode: "square" | "demo";
  status: OrderStatus;
  locationId: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone?: string;
  pickupNote?: string;
  lineItems: CartLine[];
  subtotalCents: MoneyCents;
  discountCents: MoneyCents;
  totalCents: MoneyCents;
  currency: "USD";
  squareOrderId?: string;
  paymentId?: string;
  loyaltyRewardId?: string;
  fulfillmentUid?: string;
  fulfillmentState?: string;
}

export interface LoyaltyPreview {
  available: boolean;
  mode: "square" | "demo";
  message: string;
  accountId?: string;
  balance?: number;
  rewardTiers?: Array<{
    id: string;
    name: string;
    points: number;
    discountCents?: MoneyCents;
  }>;
  catalogDiscount?: {
    id: string;
    name: string;
    discountCents: MoneyCents;
  };
}

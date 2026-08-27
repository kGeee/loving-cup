/**
 * Shared-catalog bleed + design-lock hide rules.
 * Square store also lists categories asides / adrink / apizza / astarter — filter them out.
 * `akid` is a sold-out SIZE MODIFIER, not a standalone menu item.
 */

const BLEED_NAME_PATTERNS: RegExp[] = [
  /\bpetite\s*prairie\b/i,
  /\bmarinara\b/i,
  /\branch\b/i,
  /\bdiet\s*coke\b/i,
  /\bpizza\b/i,
  /\bapizza\b/i,
  /\bpepperoni\b/i,
  /\bmargherita\b/i,
  /\bcalzone\b/i,
  /\bgarlic\s*knots?\b/i,
];

/** Square category names that are not the froyo menu. */
const DENIED_CATEGORY_PATTERNS: RegExp[] = [
  /^asides$/i,
  /^adrink$/i,
  /^apizza$/i,
  /^astarter$/i,
  /\basides\b/i,
  /\badrink\b/i,
  /\bapizza\b/i,
  /\bastarter\b/i,
];

/** Items to hide entirely this pass (empty stubs / out-of-scope). */
const HIDDEN_ITEM_PATTERNS: RegExp[] = [
  /\bastarter\b/i,
  /\brice\s*pudding\b/i,
];

const FROYO_CATEGORY_PATTERNS: RegExp[] = [
  /\bfroyo\b/i,
  /\bfrozen\s*yogurt\b/i,
  /\bloving\s*cup\b/i,
  /\bsignature\b/i,
  /\bcyob\b/i,
  /\bmake\s*your\s*own\b/i,
  /\bcreate\s*your\s*own\b/i,
  /\bmix[\s-]*ins?\b/i,
  /\bcups?\b/i,
  /\bpints?\b/i,
];

const FROYO_ITEM_PATTERNS: RegExp[] = [
  /\bfroyo\b/i,
  /\bfrozen\s*yogurt\b/i,
  /\bcyob\b/i,
  /\bmake\s*your\s*own\b/i,
  /\bcreate\s*your\s*own\b/i,
  /\bsignature\b/i,
  /\byogurt\b/i,
];

/** Size modifier named akid (sold out) — not a menu row. */
export function isAkidSizeModifier(name: string, sku?: string | null): boolean {
  const hay = `${name} ${sku ?? ""}`.toLowerCase();
  return /\bakid\b/.test(hay);
}

export function isSharedCatalogBleed(name: string): boolean {
  return BLEED_NAME_PATTERNS.some((re) => re.test(name));
}

export function isDeniedCategory(name: string): boolean {
  return DENIED_CATEGORY_PATTERNS.some((re) => re.test(name.trim()));
}

/** Empty `astarter`, rice pudding (out of pass), etc. */
export function shouldHideCatalogItem(name: string, sku?: string | null): boolean {
  const hay = `${name} ${sku ?? ""}`;
  if (HIDDEN_ITEM_PATTERNS.some((re) => re.test(hay))) return true;
  // Never list akid as a standalone item — it is a size modifier only.
  if (/^\s*akid\s*$/i.test(name) || /^\s*akid\s*$/i.test(sku ?? "")) return true;
  return false;
}

export function looksLikeFroyoCategory(name: string): boolean {
  if (isDeniedCategory(name)) return false;
  return FROYO_CATEGORY_PATTERNS.some((re) => re.test(name));
}

export function looksLikeFroyoItem(
  name: string,
  categoryNames: string[],
): boolean {
  if (isSharedCatalogBleed(name)) return false;
  if (shouldHideCatalogItem(name)) return false;
  if (categoryNames.some(isDeniedCategory)) return false;
  if (categoryNames.some(looksLikeFroyoCategory)) return true;
  if (FROYO_ITEM_PATTERNS.some((re) => re.test(name))) return true;
  return false;
}

export function isPresentAtLocation(
  obj: {
    presentAtAllLocations?: boolean | null;
    presentAtLocationIds?: string[] | null;
    absentAtLocationIds?: string[] | null;
  },
  locationId: string,
): boolean {
  if (obj.absentAtLocationIds?.includes(locationId)) return false;
  if (obj.presentAtAllLocations) return true;
  if (obj.presentAtLocationIds && obj.presentAtLocationIds.length > 0) {
    return obj.presentAtLocationIds.includes(locationId);
  }
  return true;
}

export function normalizeModifierName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

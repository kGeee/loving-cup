/**
 * Shared-catalog bleed filter.
 * Catalog is shared with apizza — never render pizza/side SKUs.
 * Also enforces `akid` sold-out and NOPA location presence.
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

/** Positive signals that an item belongs on the Loving Cup froyo menu. */
const FROYO_CATEGORY_PATTERNS: RegExp[] = [
  /\bfroyo\b/i,
  /\bfrozen\s*yogurt\b/i,
  /\bloving\s*cup\b/i,
  /\bsignature\b/i,
  /\bcyob\b/i,
  /\bcreate\s*your\s*own\b/i,
  /\bmix[\s-]*ins?\b/i,
  /\bcups?\b/i,
  /\bpints?\b/i,
];

const FROYO_ITEM_PATTERNS: RegExp[] = [
  /\bfroyo\b/i,
  /\bfrozen\s*yogurt\b/i,
  /\bcyob\b/i,
  /\bcreate\s*your\s*own\b/i,
  /\bsignature\b/i,
  /\byogurt\b/i,
];

const SIZE_HINT =
  /\b(kid|kids?|small|sm|medium|med|large|lg|pint|s|m|l)\b/i;

export function isAkidSoldOut(opts: {
  name?: string | null;
  abbreviation?: string | null;
  sku?: string | null;
  variationNames?: string[];
}): boolean {
  const hay = [
    opts.name,
    opts.abbreviation,
    opts.sku,
    ...(opts.variationNames ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  // Catalog item / SKU `akid` stays Sold out.
  return /\bakid\b/.test(hay);
}

export function isSharedCatalogBleed(name: string): boolean {
  return BLEED_NAME_PATTERNS.some((re) => re.test(name));
}

export function looksLikeFroyoCategory(name: string): boolean {
  return FROYO_CATEGORY_PATTERNS.some((re) => re.test(name));
}

export function looksLikeFroyoItem(
  name: string,
  categoryNames: string[],
): boolean {
  if (isSharedCatalogBleed(name)) return false;
  if (categoryNames.some(looksLikeFroyoCategory)) return true;
  if (FROYO_ITEM_PATTERNS.some((re) => re.test(name))) return true;
  // Size-named cups with no pizza bleed still qualify when in a soft category.
  if (SIZE_HINT.test(name) && categoryNames.length === 0) return false;
  return false;
}

/** Item is available at NOPA when present everywhere or listed for location. */
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
  // If Square omits location fields, treat as available (location filter applied upstream when possible).
  return true;
}

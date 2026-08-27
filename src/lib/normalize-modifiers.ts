/**
 * Normalize modifier sheets for the cup customizer.
 * - Classify size / base / mix-in / cone
 * - Collapse Square's two mix-in grids into ONE chip row (design lock)
 * - Toasted coconut once; prefer free ($0) over paid duplicate
 * - Pull cone out of paid mix-in lists into Cone sheet
 * - Mark size `akid` sold out (not a menu item)
 */

import {
  isAkidSizeModifier,
  normalizeModifierName,
} from "@/lib/catalog-filter";
import type {
  MenuItem,
  MenuModifier,
  MenuModifierList,
  ModifierListRole,
} from "@/types/menu";

export function inferModifierListRole(name: string): ModifierListRole {
  if (/\bsize\b/i.test(name)) return "size";
  if (/\bcone\b/i.test(name) && !/mix/i.test(name)) return "cone";
  if (/\bbase\b|\bflavor\b|\byogurt\b/i.test(name) && !/mix/i.test(name)) {
    return "base";
  }
  if (
    /\bmix[\s-]*in/i.test(name) ||
    /\btopping/i.test(name) ||
    /\bextra\b/i.test(name) ||
    /\bfree\b/i.test(name)
  ) {
    return "mixin";
  }
  return "other";
}

function markAkidSoldOut(modifiers: MenuModifier[]): MenuModifier[] {
  return modifiers.map((m) =>
    isAkidSizeModifier(m.name)
      ? { ...m, soldOut: true }
      : m,
  );
}

/**
 * Deduplicate by normalized name.
 * Coconut → single "Toasted Coconut".
 * When free ($0) and paid (+$0.75) collide, keep the free entry (design lock one list).
 * Sold-out flag is preserved (OR).
 */
function dedupeModifiers(modifiers: MenuModifier[]): MenuModifier[] {
  const seen = new Map<string, MenuModifier>();
  for (const m of modifiers) {
    const key = normalizeModifierName(m.name);
    const coconutKey = key.includes("coconut") ? "toasted coconut" : key;
    const normalized: MenuModifier = {
      ...m,
      name: coconutKey === "toasted coconut" ? "Toasted Coconut" : m.name,
      soldOut: m.soldOut || isAkidSizeModifier(m.name),
    };
    const existing = seen.get(coconutKey);
    if (!existing) {
      seen.set(coconutKey, normalized);
      continue;
    }
    const preferNew =
      // Prefer free over paid for the same mix-in name.
      (normalized.price.amount === 0 && existing.price.amount > 0) ||
      // Otherwise keep sold-out / first.
      false;
    seen.set(coconutKey, {
      ...(preferNew ? normalized : existing),
      soldOut: Boolean(existing.soldOut || normalized.soldOut),
      // Keep free price when either is free.
      price:
        existing.price.amount === 0 || normalized.price.amount === 0
          ? { amount: 0, currency: "USD" }
          : preferNew
            ? normalized.price
            : existing.price,
    });
  }
  return [...seen.values()];
}

function extractConeFromMixins(modifiers: MenuModifier[]): {
  mixins: MenuModifier[];
  cones: MenuModifier[];
} {
  const mixins: MenuModifier[] = [];
  const cones: MenuModifier[] = [];
  for (const m of modifiers) {
    if (/\bcone\b/i.test(m.name)) cones.push(m);
    else mixins.push(m);
  }
  return { mixins, cones };
}

const ROLE_ORDER: ModifierListRole[] = [
  "size",
  "base",
  "mixin",
  "cone",
  "other",
];

/**
 * Merge mixin lists + dedupe chips. Size/base/cone stay separate sheets.
 * Does NOT clone Square's two ~30-item grids.
 */
export function normalizeModifierLists(
  lists: MenuModifierList[],
): MenuModifierList[] {
  const withRoles = lists.map((l) => ({
    ...l,
    role: l.role && l.role !== "other" ? l.role : inferModifierListRole(l.name),
    modifiers: markAkidSoldOut(l.modifiers),
  }));

  const mixins = withRoles.filter((l) => l.role === "mixin");
  const rest = withRoles.filter((l) => l.role !== "mixin");

  let mergedMixin: MenuModifierList | null = null;
  const pulledCones: MenuModifier[] = [];

  if (mixins.length > 0) {
    const flat = mixins.flatMap((l) => l.modifiers);
    const { mixins: onlyMixins, cones } = extractConeFromMixins(flat);
    pulledCones.push(...cones);
    const allMods = dedupeModifiers(onlyMixins);
    const included = Math.max(0, ...mixins.map((l) => l.includedCount ?? 0));
    const minSelected = Math.max(...mixins.map((l) => l.minSelected), 0);
    const maxes = mixins
      .map((l) => l.maxSelected)
      .filter((m): m is number => m != null);
    mergedMixin = {
      id: mixins[0].id,
      name: "Mix-ins",
      role: "mixin",
      selectionType: "MULTIPLE",
      minSelected,
      maxSelected: maxes.length ? Math.max(...maxes) : null,
      includedCount: included > 0 ? included : undefined,
      modifiers: allMods,
    };
  }

  let combined = mergedMixin ? [...rest, mergedMixin] : [...rest];

  if (pulledCones.length > 0) {
    const existingCone = combined.find((l) => l.role === "cone");
    if (existingCone) {
      existingCone.modifiers = dedupeModifiers([
        ...existingCone.modifiers,
        ...pulledCones,
      ]);
    } else {
      combined.push({
        id: "ml_cone_extracted",
        name: "Cone",
        role: "cone",
        selectionType: "SINGLE",
        minSelected: 0,
        maxSelected: 1,
        modifiers: dedupeModifiers(pulledCones),
      });
    }
  }

  // Ensure size modifiers mark akid sold out after any transforms.
  combined = combined.map((l) =>
    l.role === "size"
      ? { ...l, modifiers: markAkidSoldOut(dedupeModifiers(l.modifiers)) }
      : l,
  );

  return combined.sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );
}

export function normalizeMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    modifierLists: normalizeModifierLists(item.modifierLists),
  };
}

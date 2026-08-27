/**
 * Normalize modifier sheets for the cup customizer.
 * - Classify size / base / mix-in / cone
 * - Collapse duplicate mix-in lists into one chip row
 * - Deduplicate modifiers by name (toasted coconut once — not two ~30-item grids)
 */

import { normalizeModifierName } from "@/lib/catalog-filter";
import type {
  MenuItem,
  MenuModifier,
  MenuModifierList,
  ModifierListRole,
} from "@/types/menu";

export function inferModifierListRole(name: string): ModifierListRole {
  if (/\bsize\b/i.test(name)) return "size";
  if (/\bbase\b|\bflavor\b|\byogurt\b/i.test(name) && !/mix/i.test(name)) {
    return "base";
  }
  if (/\bcone\b/i.test(name)) return "cone";
  if (/\bmix[\s-]*in/i.test(name) || /\btopping/i.test(name) || /\bextra\b/i.test(name)) {
    return "mixin";
  }
  return "other";
}

function dedupeModifiers(modifiers: MenuModifier[]): MenuModifier[] {
  const seen = new Map<string, MenuModifier>();
  for (const m of modifiers) {
    const key = normalizeModifierName(m.name);
    // Prefer "toasted coconut" spelling if we see coconut variants.
    const coconutKey = key.includes("coconut") ? "toasted coconut" : key;
    const existing = seen.get(coconutKey);
    if (!existing) {
      seen.set(coconutKey, {
        ...m,
        name: coconutKey === "toasted coconut" ? "Toasted Coconut" : m.name,
      });
      continue;
    }
    // Keep the higher-priced entry if one is $0 duplicate.
    if (m.price.amount > existing.price.amount) {
      seen.set(coconutKey, {
        ...m,
        name: coconutKey === "toasted coconut" ? "Toasted Coconut" : m.name,
      });
    }
  }
  return [...seen.values()];
}

const ROLE_ORDER: ModifierListRole[] = [
  "size",
  "base",
  "mixin",
  "cone",
  "other",
];

/**
 * Merge mixin lists + dedupe chips. Size/base/cone stay separate single sheets.
 */
export function normalizeModifierLists(
  lists: MenuModifierList[],
): MenuModifierList[] {
  const withRoles = lists.map((l) => ({
    ...l,
    role: l.role && l.role !== "other" ? l.role : inferModifierListRole(l.name),
    modifiers: dedupeModifiers(l.modifiers),
  }));

  const mixins = withRoles.filter((l) => l.role === "mixin");
  const rest = withRoles.filter((l) => l.role !== "mixin");

  let mergedMixin: MenuModifierList | null = null;
  if (mixins.length > 0) {
    const allMods = dedupeModifiers(mixins.flatMap((l) => l.modifiers));
    const included = Math.max(0, ...mixins.map((l) => l.includedCount ?? 0));
    const minSelected = Math.max(...mixins.map((l) => l.minSelected), 0);
    const maxes = mixins.map((l) => l.maxSelected).filter((m): m is number => m != null);
    mergedMixin = {
      id: mixins[0].id,
      name:
        included > 0
          ? `Mix-ins (${included} included)`
          : mixins.length > 1
            ? "Mix-ins"
            : mixins[0].name,
      role: "mixin",
      selectionType: "MULTIPLE",
      minSelected,
      maxSelected: maxes.length ? Math.max(...maxes) : null,
      includedCount: included > 0 ? included : undefined,
      modifiers: allMods,
    };
  }

  const combined = mergedMixin ? [...rest, mergedMixin] : rest;
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

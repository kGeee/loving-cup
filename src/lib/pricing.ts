import type { CartLine, MenuItem, MenuModifierList } from "@/types/menu";
import { pricedModifiersForLine } from "@/lib/demo-catalog";

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function buildCartLine(opts: {
  item: MenuItem;
  variationId: string;
  quantity: number;
  /** modifierListId → selected modifier ids */
  selections: Record<string, string[]>;
  note?: string;
  lineId: string;
}): CartLine {
  if (opts.item.soldOut) {
    throw new Error(`${opts.item.name} is sold out.`);
  }
  const variation = opts.item.variations.find((v) => v.id === opts.variationId);
  if (!variation) throw new Error("Invalid catalog variation.");

  for (const list of opts.item.modifierLists) {
    for (const id of opts.selections[list.id] ?? []) {
      const mod = list.modifiers.find((m) => m.id === id);
      if (mod?.soldOut || /\bakid\b/i.test(mod?.name ?? "")) {
        throw new Error(
          `${mod?.name ?? "akid"} is sold out and cannot be ordered.`,
        );
      }
    }
  }

  const recipeMixinIds = opts.item.recipeMixinIds;

  const modifiers = opts.item.modifierLists.flatMap((list) => {
    const selected = opts.selections[list.id] ?? [];
    return pricedFromList(list, selected, recipeMixinIds).map((p) => ({
      modifierListId: list.id,
      modifierId: p.modifierId,
      name: p.name,
      priceCents: p.priceCents,
    }));
  });

  return {
    lineId: opts.lineId,
    itemId: opts.item.id,
    itemName: opts.item.name,
    variationId: variation.id,
    variationName: variation.name,
    quantity: opts.quantity,
    unitPriceCents: variation.price.amount,
    modifiers,
    note: opts.note,
  };
}

function pricedFromList(
  list: MenuModifierList,
  selectedIds: string[],
  recipeMixinIds?: string[],
): { modifierId: string; name: string; priceCents: number }[] {
  if (list.role === "mixin" && recipeMixinIds && recipeMixinIds.length > 0) {
    return pricedModifiersForLine(list, selectedIds, recipeMixinIds);
  }
  if (list.includedCount && list.includedCount > 0) {
    return pricedModifiersForLine(list, selectedIds);
  }
  return list.modifiers
    .filter((m) => selectedIds.includes(m.id))
    .map((m) => ({
      modifierId: m.id,
      name: m.name,
      priceCents: m.price.amount,
    }));
}

export function cartLineTotal(line: CartLine): number {
  const mods = line.modifiers.reduce((s, m) => s + m.priceCents, 0);
  return (line.unitPriceCents + mods) * line.quantity;
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + cartLineTotal(l), 0);
}

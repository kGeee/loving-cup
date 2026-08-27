"use client";

import { useCart } from "@/components/CartProvider";
import { buildCartLine, formatUsd } from "@/lib/pricing";
import type { MenuItem, MenuModifierList } from "@/types/menu";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function defaultSelections(
  item: MenuItem,
): Record<string, string[]> {
  const lists = item.modifierLists;
  const locked = new Set(item.recipeMixinIds ?? []);
  const init: Record<string, string[]> = {};
  for (const list of lists) {
    if (list.role === "size") {
      const firstOrderable =
        list.modifiers.find((m) => !m.soldOut) ?? list.modifiers[0];
      init[list.id] =
        firstOrderable && !firstOrderable.soldOut ? [firstOrderable.id] : [];
      continue;
    }
    if (list.role === "mixin" && locked.size > 0) {
      init[list.id] = list.modifiers
        .filter((m) => locked.has(m.id))
        .map((m) => m.id);
      continue;
    }
    if (list.selectionType === "SINGLE" && list.minSelected > 0) {
      const first = list.modifiers.find((m) => !m.soldOut);
      init[list.id] = first ? [first.id] : [];
    } else {
      init[list.id] = [];
    }
  }
  return init;
}

function chipPriceLabel(
  list: MenuModifierList,
  amount: number,
  locked: boolean,
): string | null {
  if (locked) return "Included";
  // MYO: first 2 included — do not put +$0.75 on every chip.
  if (list.role === "mixin" && (list.includedCount ?? 0) > 0) {
    return null;
  }
  if (amount <= 0) return null;
  return `+${formatUsd(amount)}`;
}

export function CupCustomizer({ item }: { item: MenuItem }) {
  const router = useRouter();
  const { addLine } = useCart();
  const recipeLocked = useMemo(
    () => new Set(item.recipeMixinIds ?? []),
    [item.recipeMixinIds],
  );
  const isNamed = recipeLocked.size > 0;
  const isMyo = /make\s*your\s*own/i.test(item.name);

  // Size lives on modifiers (+$1.01 etc). Variation is the cup base ($4.99).
  const [variationId] = useState(item.variations[0]?.id ?? "");
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    defaultSelections(item),
  );
  const [error, setError] = useState<string | null>(null);

  // Named cups: no base picker (sheets omit it). Live Square with no mix-in
  // list stays size-only — demo local add-ons are demo-catalog only.
  const sheets = useMemo(() => {
    if (isNamed || isMyo) return item.modifierLists;
    // Named without recipe ids (live): hide base if present so size stays first.
    return item.modifierLists.filter((l) => l.role !== "base");
  }, [item.modifierLists, isNamed, isMyo]);

  const preview = useMemo(() => {
    try {
      return buildCartLine({
        item,
        variationId,
        quantity: 1,
        selections,
        lineId: "preview",
      });
    } catch {
      return null;
    }
  }, [item, variationId, selections]);

  const total = preview
    ? preview.unitPriceCents +
      preview.modifiers.reduce((s, m) => s + m.priceCents, 0)
    : 0;

  function toggle(listId: string, modId: string, list: MenuModifierList) {
    const mod = list.modifiers.find((m) => m.id === modId);
    if (mod?.soldOut) return;
    // Recipe mix-ins stay locked on named cups.
    if (recipeLocked.has(modId)) return;
    setSelections((prev) => {
      const current = prev[listId] ?? [];
      if (list.selectionType === "SINGLE") {
        return {
          ...prev,
          [listId]:
            current.includes(modId) && list.minSelected === 0 ? [] : [modId],
        };
      }
      if (current.includes(modId)) {
        return { ...prev, [listId]: current.filter((id) => id !== modId) };
      }
      const max = list.maxSelected ?? 99;
      if (current.length >= max) return prev;
      return { ...prev, [listId]: [...current, modId] };
    });
  }

  function addToCart() {
    setError(null);
    if (item.soldOut) {
      setError("This item is sold out.");
      return;
    }
    try {
      for (const list of item.modifierLists) {
        const selected = selections[list.id] ?? [];
        if (selected.length < list.minSelected) {
          setError(`Choose ${list.minSelected} from ${list.name}.`);
          return;
        }
        for (const id of selected) {
          const mod = list.modifiers.find((m) => m.id === id);
          if (mod?.soldOut) {
            setError(`${mod.name} is sold out and cannot be ordered.`);
            return;
          }
        }
      }
      const line = buildCartLine({
        item,
        variationId,
        quantity: 1,
        selections,
        lineId: crypto.randomUUID(),
      });
      addLine(line);
      router.push("/cart");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to cart");
    }
  }

  if (item.soldOut) {
    return (
      <div className="customizer">
        <p className="sold-out-banner">Sold out — cannot be ordered.</p>
      </div>
    );
  }

  const basePrice = item.variations[0]?.price.amount ?? 0;

  return (
    <div className="customizer">
      <p className="customizer__base">
        Cup base {formatUsd(basePrice)}
        {isMyo ? (
          <span> · size, base, mix-ins &amp; cone</span>
        ) : (
          <span> · size, mix-ins &amp; cone</span>
        )}
      </p>

      {sheets.map((list) => (
        <fieldset key={list.id} className="sheet">
          <legend>
            {list.name}
            {list.role === "size" ? " · required" : null}
            {list.role === "mixin" && isNamed
              ? " · recipe included, extras +$0.75"
              : null}
            {list.role === "mixin" && !isNamed && list.includedCount
              ? ` · ${list.includedCount} included, extras +$0.75`
              : null}
            {list.role === "cone" ? " · +$1.25" : null}
          </legend>
          <div className="chip-row chip-row--wrap">
            {list.modifiers.map((m) => {
              const locked = recipeLocked.has(m.id);
              const on = (selections[list.id] ?? []).includes(m.id) || locked;
              const priceLabel = m.soldOut
                ? null
                : chipPriceLabel(list, m.price.amount, locked);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={m.soldOut || locked}
                  aria-disabled={m.soldOut || locked || undefined}
                  aria-pressed={on}
                  className={`chip ${on ? "chip--on" : ""} ${m.soldOut ? "chip--soldout" : ""} ${locked ? "chip--locked" : ""}`}
                  onClick={() => toggle(list.id, m.id, list)}
                >
                  {m.name}
                  {m.soldOut ? (
                    <span>Sold out</span>
                  ) : priceLabel ? (
                    <span>{priceLabel}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="customizer__footer">
        <p className="customizer__total">{formatUsd(total)}</p>
        <button
          type="button"
          className="btn btn--primary btn--berry-add"
          onClick={addToCart}
        >
          Add
        </button>
      </div>
    </div>
  );
}

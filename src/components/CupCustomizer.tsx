"use client";

import { useCart } from "@/components/CartProvider";
import { buildCartLine, formatUsd } from "@/lib/pricing";
import type { MenuItem, MenuModifierList } from "@/types/menu";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function defaultSizeSelection(lists: MenuModifierList[]): Record<string, string[]> {
  const init: Record<string, string[]> = {};
  for (const list of lists) {
    if (list.role === "size") {
      const kid =
        list.modifiers.find((m) => /^kid$/i.test(m.name)) ??
        list.modifiers.find((m) => m.price.amount === 0) ??
        list.modifiers[0];
      init[list.id] = kid ? [kid.id] : [];
      continue;
    }
    if (list.selectionType === "SINGLE" && list.minSelected > 0) {
      init[list.id] = list.modifiers[0] ? [list.modifiers[0].id] : [];
    } else {
      init[list.id] = [];
    }
  }
  return init;
}

export function CupCustomizer({ item }: { item: MenuItem }) {
  const router = useRouter();
  const { addLine } = useCart();
  // Size lives on modifiers (+$1.01 etc). Variation is the cup base ($4.99).
  const [variationId] = useState(item.variations[0]?.id ?? "");
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    defaultSizeSelection(item.modifierLists),
  );
  const [error, setError] = useState<string | null>(null);

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
        <span> · size &amp; mix-ins from catalog modifiers</span>
      </p>

      {item.modifierLists.map((list) => (
        <fieldset key={list.id} className="sheet">
          <legend>
            {list.name}
            {list.includedCount
              ? ` · ${list.includedCount} included`
              : null}
          </legend>
          <div className="chip-row chip-row--wrap">
            {list.modifiers.map((m) => {
              const on = (selections[list.id] ?? []).includes(m.id);
              const showPrice =
                list.role === "size"
                  ? true
                  : m.price.amount > 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`chip ${on ? "chip--on" : ""}`}
                  onClick={() => toggle(list.id, m.id, list)}
                >
                  {m.name}
                  {showPrice ? (
                    <span>
                      {m.price.amount === 0
                        ? formatUsd(0)
                        : `+${formatUsd(m.price.amount)}`}
                    </span>
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
        <button type="button" className="btn btn--primary" onClick={addToCart}>
          Add to cart
        </button>
      </div>
    </div>
  );
}

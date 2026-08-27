"use client";

import { useCart } from "@/components/CartProvider";
import { buildCartLine, formatUsd } from "@/lib/pricing";
import type { MenuItem } from "@/types/menu";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function CupCustomizer({ item }: { item: MenuItem }) {
  const router = useRouter();
  const { addLine } = useCart();
  const defaultVariation =
    item.variations.find((v) => v.name === "M") ?? item.variations[0];
  const [variationId, setVariationId] = useState(defaultVariation?.id ?? "");
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const list of item.modifierLists) {
      if (list.selectionType === "SINGLE" && list.minSelected > 0) {
        init[list.id] = list.modifiers[0] ? [list.modifiers[0].id] : [];
      } else {
        init[list.id] = [];
      }
    }
    return init;
  });
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

  function toggle(listId: string, modId: string, list: (typeof item.modifierLists)[0]) {
    setSelections((prev) => {
      const current = prev[listId] ?? [];
      if (list.selectionType === "SINGLE") {
        return { ...prev, [listId]: current.includes(modId) && list.minSelected === 0 ? [] : [modId] };
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

  return (
    <div className="customizer">
      <fieldset className="sheet">
        <legend>Size</legend>
        <div className="chip-row">
          {item.variations.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`chip ${variationId === v.id ? "chip--on" : ""}`}
              onClick={() => setVariationId(v.id)}
            >
              {v.name}
              <span>{formatUsd(v.price.amount)}</span>
            </button>
          ))}
        </div>
      </fieldset>

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
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`chip ${on ? "chip--on" : ""}`}
                  onClick={() => toggle(list.id, m.id, list)}
                >
                  {m.name}
                  {m.price.amount > 0 ? (
                    <span>+{formatUsd(m.price.amount)}</span>
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
